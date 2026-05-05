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


@router.get("")
async def verify_webhook(
    hub_mode: str = Query(alias="hub.mode"),
    hub_verify_token: str = Query(alias="hub.verify_token"),
    hub_challenge: str = Query(alias="hub.challenge"),
):
    """Verificación del webhook de Meta Cloud API."""
    if hub_mode == "subscribe" and hub_verify_token == settings.meta_verify_token:
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Token de verificación inválido")


@router.post("")
async def receive_message(request: Request):
    """Recibe mensajes de WhatsApp y los procesa con el agente."""
    body: dict[str, Any] = await request.json()

    try:
        entry = body.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        messages = value.get("messages", [])

        if not messages:
            return {"status": "ok"}  # Notificación de estado, no mensaje

        message = messages[0]
        from_number = message.get("from")
        msg_type = message.get("type")

        # Determinar clinic_id desde el número receptor
        # En MVP: una sola clínica por número. En producción: lookup en DB.
        metadata = value.get("metadata", {})
        phone_number_id = metadata.get("phone_number_id")
        clinic_id = await _get_clinic_by_phone_number_id(phone_number_id)
        if not clinic_id:
            logger.warning("Número %s no asociado a ninguna clínica", phone_number_id)
            return {"status": "ok"}

        # Obtener texto del mensaje
        if msg_type == "text":
            texto = message["text"]["body"]
        elif msg_type == "audio":
            texto = await _transcribe_whatsapp_audio(message["audio"]["id"])
        else:
            logger.info("Tipo de mensaje no soportado: %s", msg_type)
            return {"status": "ok"}

        # Buscar paciente por teléfono
        paciente = await buscar_paciente(clinic_id, from_number)
        paciente_id = paciente["id"] if paciente else None

        # Buscar conversación activa
        from database.client import get_supabase
        db = get_supabase()
        conv_res = db.table("conversaciones") \
            .select("id, estado") \
            .eq("clinic_id", clinic_id) \
            .eq("canal", "whatsapp") \
            .filter("paciente_id", "eq", paciente_id) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        conversacion_id = None
        if conv_res.data and conv_res.data[0]["estado"] == "activa":
            conversacion_id = conv_res.data[0]["id"]

        respuesta, conversacion_id = await run_agent(
            clinic_id=clinic_id,
            conversacion_id=conversacion_id,
            user_message=texto,
            canal="whatsapp",
            paciente_id=paciente_id,
        )

        await _send_whatsapp_message(from_number, respuesta)

    except Exception as e:
        logger.error("Error procesando mensaje WhatsApp: %s", e)

    return {"status": "ok"}


async def _get_clinic_by_phone_number_id(phone_number_id: str | None) -> str | None:
    if not phone_number_id:
        return None
    from database.client import get_supabase
    db = get_supabase()
    # Buscar clínica por META_PHONE_NUMBER_ID (en MVP, configurado en la clínica)
    result = db.table("clinicas") \
        .select("id") \
        .eq("whatsapp_number", phone_number_id) \
        .limit(1) \
        .execute()
    if result.data:
        return result.data[0]["id"]
    # Fallback: si solo hay una clínica en DB (útil en desarrollo)
    all_clinics = db.table("clinicas").select("id").limit(1).execute()
    if all_clinics.data:
        return all_clinics.data[0]["id"]
    return None


async def _transcribe_whatsapp_audio(audio_id: str) -> str:
    """Descarga el audio de WhatsApp y lo transcribe con Whisper."""
    from openai import AsyncOpenAI
    from config import settings as cfg

    # Obtener URL de descarga del audio
    async with httpx.AsyncClient() as client:
        media_res = await client.get(
            f"https://graph.facebook.com/v21.0/{audio_id}",
            headers={"Authorization": f"Bearer {cfg.meta_access_token}"},
        )
        media_url = media_res.json()["url"]

        audio_res = await client.get(
            media_url,
            headers={"Authorization": f"Bearer {cfg.meta_access_token}"},
        )
        audio_bytes = audio_res.content

    with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as f:
        f.write(audio_bytes)
        tmp_path = f.name

    openai = AsyncOpenAI(api_key=cfg.openai_api_key)
    with open(tmp_path, "rb") as audio_file:
        transcript = await openai.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language="es",
        )

    import os
    os.unlink(tmp_path)
    return transcript.text


async def _send_whatsapp_message(to: str, text: str) -> None:
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": text},
    }
    async with httpx.AsyncClient() as client:
        await client.post(
            f"https://graph.facebook.com/v21.0/{settings.meta_phone_number_id}/messages",
            json=payload,
            headers={
                "Authorization": f"Bearer {settings.meta_access_token}",
                "Content-Type": "application/json",
            },
        )
