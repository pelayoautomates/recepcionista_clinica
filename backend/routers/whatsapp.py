"""
WhatsApp webhook router.
Supports two BSPs:
  - Meta Cloud API (legacy, direct): GET/POST /whatsapp
  - 360dialog (recommended): GET/POST /whatsapp/360dialog

Both use the same Meta webhook format, differ only in the send API.
"""
import hashlib
import hmac
import json
import logging
import tempfile
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query, Request

from agent.core import run_agent
from config import settings
from tools.pacientes import buscar_paciente

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Shared helpers ────────────────────────────────────────────────────────────

async def _get_active_conv(clinic_id: str, paciente_id: str | None) -> str | None:
    from database.client import get_supabase
    db = get_supabase()
    q = db.table("conversaciones").select("id, estado").eq("clinic_id", clinic_id).eq("canal", "whatsapp")
    if paciente_id:
        q = q.eq("paciente_id", paciente_id)
    res = q.order("created_at", desc=True).limit(1).execute()
    if res.data and res.data[0]["estado"] == "activa":
        return res.data[0]["id"]
    return None


async def _process_wa_message(
    clinic_id: str,
    from_number: str,
    text: str,
    send_fn,  # async (to: str, reply: str) -> None
) -> None:
    paciente = await buscar_paciente(clinic_id, from_number)
    paciente_id = paciente["id"] if paciente else None
    conversacion_id = await _get_active_conv(clinic_id, paciente_id)

    respuesta, _ = await run_agent(
        clinic_id=clinic_id,
        conversacion_id=conversacion_id,
        user_message=text,
        canal="whatsapp",
        paciente_id=paciente_id,
    )
    await send_fn(from_number, respuesta)


# ── Meta Cloud API (legacy) ───────────────────────────────────────────────────

@router.get("")
async def verify_webhook_meta(
    hub_mode: str = Query(alias="hub.mode"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
    hub_challenge: str = Query(alias="hub.challenge"),
):
    if hub_mode == "subscribe" and hub_verify_token == settings.meta_verify_token:
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Token de verificación inválido")


@router.post("")
async def receive_message_meta(request: Request):
    raw_body = await request.body()

    if settings.meta_app_secret:
        signature = request.headers.get("x-hub-signature-256", "")
        expected = "sha256=" + hmac.new(
            settings.meta_app_secret.encode(), raw_body, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise HTTPException(status_code=403, detail="Invalid signature")

    body: dict[str, Any] = json.loads(raw_body)
    try:
        entry = body.get("entry", [{}])[0]
        value = entry.get("changes", [{}])[0].get("value", {})
        messages = value.get("messages", [])
        if not messages:
            return {"status": "ok"}

        message = messages[0]
        from_number = message.get("from")
        phone_number_id = value.get("metadata", {}).get("phone_number_id")

        clinic_id = await _get_meta_clinic(phone_number_id)
        if not clinic_id:
            logger.warning("Meta WA: phone_number_id %s no asociado a clínica", phone_number_id)
            return {"status": "ok"}

        text = await _extract_text_meta(message)
        if not text:
            return {"status": "ok"}

        await _process_wa_message(
            clinic_id, from_number, text,
            lambda to, reply: _send_meta(to, reply),
        )
    except Exception as e:
        logger.error("Error procesando mensaje Meta WA: %s", e)
    return {"status": "ok"}


async def _get_meta_clinic(phone_number_id: str | None) -> str | None:
    if not phone_number_id:
        return None
    from database.client import get_supabase
    db = get_supabase()
    res = db.table("clinicas").select("id").eq("whatsapp_number", phone_number_id).limit(1).execute()
    if res.data:
        return res.data[0]["id"]
    # Fallback: single clinic in dev
    all_c = db.table("clinicas").select("id").limit(1).execute()
    return all_c.data[0]["id"] if all_c.data else None


async def _extract_text_meta(message: dict) -> str:
    msg_type = message.get("type")
    if msg_type == "text":
        return message["text"]["body"]
    if msg_type == "audio":
        return await _transcribe_meta_audio(message["audio"]["id"])
    logger.info("Meta WA: tipo no soportado %s", msg_type)
    return ""


async def _transcribe_meta_audio(audio_id: str) -> str:
    import os
    from openai import AsyncOpenAI
    async with httpx.AsyncClient(timeout=30) as client:
        media_res = await client.get(
            f"https://graph.facebook.com/v21.0/{audio_id}",
            headers={"Authorization": f"Bearer {settings.meta_access_token}"},
        )
        media_res.raise_for_status()
        media_url = media_res.json().get("url")
        audio_res = await client.get(media_url, headers={"Authorization": f"Bearer {settings.meta_access_token}"})
        audio_res.raise_for_status()
        audio_bytes = audio_res.content

    with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as f:
        f.write(audio_bytes)
        tmp = f.name
    try:
        openai = AsyncOpenAI(api_key=settings.openai_api_key)
        with open(tmp, "rb") as af:
            t = await openai.audio.transcriptions.create(model="whisper-1", file=af, language="es")
        return t.text
    finally:
        os.unlink(tmp)


async def _send_meta(to: str, text: str) -> None:
    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://graph.facebook.com/v21.0/{settings.meta_phone_number_id}/messages",
            json={"messaging_product": "whatsapp", "to": to, "type": "text", "text": {"body": text}},
            headers={"Authorization": f"Bearer {settings.meta_access_token}", "Content-Type": "application/json"},
        )


# ── Twilio WhatsApp ───────────────────────────────────────────────────────────

@router.post("/twilio")
async def receive_message_twilio(request: Request):
    """Receive WhatsApp messages from Twilio sandbox or production."""
    form = await request.form()

    from_number = str(form.get("From", "")).replace("whatsapp:", "")
    to_number = str(form.get("To", ""))
    body = str(form.get("Body", "")).strip()

    if not from_number or not body:
        return {"status": "ok"}

    try:
        import twilio_wa
        clinic_row = await twilio_wa.get_clinic_by_twilio_number(to_number)
        if not clinic_row:
            logger.warning("Twilio WA: número %s no asociado a clínica", to_number)
            return {"status": "ok"}

        clinic_id = clinic_row["id"]

        await _process_wa_message(
            clinic_id, from_number, body,
            lambda to, reply: twilio_wa.send_message(to, reply),
        )
    except Exception as e:
        logger.error("Error procesando mensaje Twilio WA: %s", e)

    # Twilio espera respuesta TwiML vacía si no queremos respuesta inmediata
    from fastapi.responses import Response
    return Response(content="<Response/>", media_type="application/xml")


# ── 360dialog ────────────────────────────────────────────────────────────────

@router.get("/360dialog")
async def verify_webhook_360(
    hub_mode: str = Query(alias="hub.mode", default=""),
    hub_verify_token: str = Query(alias="hub.verify_token", default=""),
    hub_challenge: str = Query(alias="hub.challenge", default=""),
):
    """360dialog uses the same webhook verification as Meta."""
    if hub_mode == "subscribe" and hub_verify_token == settings.meta_verify_token:
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Token de verificación inválido")


@router.post("/360dialog")
async def receive_message_360(request: Request):
    """Receive messages from 360dialog and process with agent."""
    raw_body = await request.body()
    body: dict[str, Any] = json.loads(raw_body)

    try:
        entry = body.get("entry", [{}])[0]
        value = entry.get("changes", [{}])[0].get("value", {})
        messages = value.get("messages", [])
        if not messages:
            return {"status": "ok"}

        message = messages[0]
        from_number = message.get("from")
        phone_number_id = value.get("metadata", {}).get("phone_number_id")

        # Look up clinic by 360dialog phone_id
        from dialog360 import get_clinic_by_phone_id
        clinic_row = await get_clinic_by_phone_id(phone_number_id)
        if not clinic_row:
            logger.warning("360dialog: phone_id %s no asociado a clínica", phone_number_id)
            return {"status": "ok"}

        clinic_id = clinic_row["id"]
        api_key = clinic_row["dialog360_api_key"]

        text = await _extract_text_360(message, api_key)
        if not text:
            return {"status": "ok"}

        import dialog360
        await _process_wa_message(
            clinic_id, from_number, text,
            lambda to, reply: dialog360.send_message(api_key, to, reply),
        )
    except Exception as e:
        logger.error("Error procesando mensaje 360dialog: %s", e)
    return {"status": "ok"}


async def _extract_text_360(message: dict, api_key: str) -> str:
    msg_type = message.get("type")
    if msg_type == "text":
        return message["text"]["body"]
    if msg_type == "audio":
        import dialog360
        return await dialog360.transcribe_audio(api_key, message["audio"]["id"], settings.openai_api_key)
    logger.info("360dialog: tipo no soportado %s", msg_type)
    return ""
