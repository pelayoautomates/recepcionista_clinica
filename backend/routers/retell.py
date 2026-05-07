import hashlib
import hmac
import json
import logging
import re
import time
from datetime import datetime, timezone
from uuid import NAMESPACE_URL, uuid5

from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect

from agent.core import run_agent
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


def _extract_clinic_id(call: dict, message: dict | None = None) -> str | None:
    candidates = [
        (call.get("metadata") or {}).get("clinic_id"),
        (call.get("retell_llm_dynamic_variables") or {}).get("clinic_id"),
        (call.get("dynamic_variables") or {}).get("clinic_id"),
    ]

    if message:
        candidates.extend(
            [
                (message.get("metadata") or {}).get("clinic_id"),
                (message.get("retell_llm_dynamic_variables") or {}).get("clinic_id"),
                (message.get("dynamic_variables") or {}).get("clinic_id"),
                (message.get("call_metadata") or {}).get("clinic_id"),
            ]
        )

    for value in candidates:
        if isinstance(value, str) and value.strip():
            return value.strip()

    return None


def _conversation_id_from_call_id(call_id: str) -> str:
    # conversaciones.id is UUID and Retell call_id is an opaque string.
    # Use deterministic UUID so each call always maps to the same record.
    return str(uuid5(NAMESPACE_URL, f"retell:{call_id}"))


def _retell_response(response_id: int, content: str, content_complete: bool = True, end_call: bool = False) -> dict:
    return {
        "response_type": "response",
        "response_id": response_id,
        "content": content,
        "content_complete": content_complete,
        "end_call": end_call,
    }


def _verify_retell_signature(raw_body: str, signature: str, api_key: str) -> bool:
    if not signature:
        return False

    match = re.match(r"^v=(\d+),d=(.+)$", signature.strip())
    if not match:
        return False

    timestamp_str, digest = match.groups()
    try:
        timestamp = int(timestamp_str)
    except ValueError:
        return False

    now_ms = int(time.time() * 1000)
    if abs(now_ms - timestamp) > 5 * 60 * 1000:
        return False

    expected = hmac.new(
        api_key.encode("utf-8"),
        msg=(raw_body + timestamp_str).encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, digest)


def _ensure_conversation_exists(clinic_id: str, conversacion_id: str) -> None:
    from database.client import get_supabase

    db = get_supabase()
    existing = (
        db.table("conversaciones")
        .select("id")
        .eq("id", conversacion_id)
        .eq("clinic_id", clinic_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        return

    db.table("conversaciones").insert(
        {
            "id": conversacion_id,
            "clinic_id": clinic_id,
            "canal": "voz",
            "estado": "activa",
            "mensajes": [],
        }
    ).execute()


@router.websocket("/llm-websocket")
async def retell_llm_websocket(websocket: WebSocket):
    await _handle_retell_ws(websocket, path_call_id=None)


@router.websocket("/llm-websocket/{call_id}")
async def retell_llm_websocket_with_id(websocket: WebSocket, call_id: str):
    await _handle_retell_ws(websocket, path_call_id=call_id)


async def _handle_retell_ws(websocket: WebSocket, path_call_id: str | None) -> None:
    """
    Custom LLM endpoint for Retell over WebSocket.
    Docs: https://docs.retellai.com/api-references/llm-websocket
    """
    await websocket.accept()

    call_id = path_call_id
    clinic_id = None
    conversacion_id = _conversation_id_from_call_id(call_id) if call_id else None

    await websocket.send_text(
        json.dumps(
            {
                "response_type": "config",
                "config": {
                    "auto_reconnect": True,
                    "call_details": True,
                },
            }
        )
    )
    await websocket.send_text(json.dumps(_retell_response(response_id=0, content="", content_complete=True)))

    try:
        while True:
            raw = await websocket.receive_text()
            message = json.loads(raw)
            interaction_type = message.get("interaction_type")

            if interaction_type == "ping_pong":
                await websocket.send_text(
                    json.dumps(
                        {
                            "response_type": "ping_pong",
                            "timestamp": message.get("timestamp", int(time.time() * 1000)),
                        }
                    )
                )
                continue

            if interaction_type == "call_details":
                call = message.get("call", {})
                call_id = call.get("call_id") or call_id
                clinic_id = _extract_clinic_id(call, message) or clinic_id
                if call_id and not conversacion_id:
                    conversacion_id = _conversation_id_from_call_id(call_id)

                if clinic_id and conversacion_id:
                    _ensure_conversation_exists(clinic_id, conversacion_id)

                logger.info("Retell call started - call_id=%s clinic_id=%s", call_id, clinic_id)
                continue

            if interaction_type == "update_only":
                continue

            if interaction_type not in ("response_required", "reminder_required"):
                continue

            response_id = int(message.get("response_id") or 0)
            call = message.get("call", {})
            transcript: list = message.get("transcript", [])

            if not clinic_id:
                clinic_id = _extract_clinic_id(call, message)
            if not call_id:
                call_id = call.get("call_id")
            if call_id and not conversacion_id:
                conversacion_id = _conversation_id_from_call_id(call_id)

            user_message = ""
            for turn in reversed(transcript):
                if turn.get("role") == "user":
                    user_message = (turn.get("content") or "").strip()
                    if user_message:
                        break

            if not clinic_id:
                await websocket.send_text(
                    json.dumps(
                        _retell_response(
                            response_id=response_id,
                            content="Lo siento, estoy teniendo un problema tecnico. Puedes repetirlo?",
                            content_complete=True,
                        )
                    )
                )
                continue

            if interaction_type == "reminder_required" and not user_message:
                await websocket.send_text(
                    json.dumps(
                        _retell_response(
                            response_id=response_id,
                            content="Sigo aqui para ayudarte. Cuando quieras, cuentame que necesitas.",
                            content_complete=True,
                        )
                    )
                )
                continue

            if not user_message:
                await websocket.send_text(
                    json.dumps(
                        _retell_response(
                            response_id=response_id,
                            content="Lo siento, no te he entendido. Puedes repetirlo?",
                            content_complete=True,
                        )
                    )
                )
                continue

            try:
                if conversacion_id:
                    _ensure_conversation_exists(clinic_id, conversacion_id)

                respuesta, conversacion_id = await run_agent(
                    clinic_id=clinic_id,
                    conversacion_id=conversacion_id,
                    user_message=user_message,
                    canal="voz",
                )
            except Exception as e:
                logger.error("Error in agent - call=%s: %s", call_id, e)
                respuesta = "Disculpa, ha ocurrido un problema. Puedes repetir lo que necesitas?"

            await websocket.send_text(
                json.dumps(
                    _retell_response(
                        response_id=response_id,
                        content=respuesta,
                        content_complete=True,
                        end_call=False,
                    )
                )
            )

    except WebSocketDisconnect:
        logger.info("Retell call finished - call_id=%s", call_id)
    except Exception as e:
        logger.error("Error in Retell websocket - call_id=%s: %s", call_id, e)


@router.post("/webhook")
async def retell_webhook(request: Request):
    """
    Retell webhook endpoint.
    Validates x-retell-signature when RETELL_API_KEY is configured.
    """
    raw_body = await request.body()
    raw_text = raw_body.decode("utf-8")

    if settings.retell_api_key:
        signature = request.headers.get("x-retell-signature", "")
        if not _verify_retell_signature(raw_text, signature, settings.retell_api_key):
            raise HTTPException(status_code=401, detail="Invalid Retell signature")

    body = json.loads(raw_text)
    event = body.get("event")
    call = body.get("call", {})

    if event in ("call_ended", "call_analyzed", "transcript_updated"):
        await _save_call_summary(call)

    return {"ok": True}


async def _save_call_summary(call: dict) -> None:
    try:
        clinic_id = _extract_clinic_id(call)
        call_id = call.get("call_id")
        if not clinic_id or not call_id:
            return

        conversacion_id = _conversation_id_from_call_id(call_id)

        analysis = call.get("call_analysis") or {}
        summary = (analysis.get("call_summary") or "").strip()
        transcript = (call.get("transcript") or "").strip()

        if not summary and not transcript:
            return

        from database.client import get_supabase

        db = get_supabase()
        existing = (
            db.table("conversaciones")
            .select("mensajes")
            .eq("id", conversacion_id)
            .eq("clinic_id", clinic_id)
            .limit(1)
            .execute()
        )

        mensajes = existing.data[0].get("mensajes") if existing.data else []
        mensajes = mensajes or []

        marker = f"[RETELL_CALL_SUMMARY:{call_id}]"
        already_saved = any(marker in (m.get("content") or "") for m in mensajes if isinstance(m, dict))
        if already_saved:
            return

        parts = [marker]
        if summary:
            parts.append(f"Resumen: {summary}")
        if transcript:
            parts.append(f"Transcripcion:\n{transcript}")

        mensajes.append(
            {
                "role": "system",
                "content": "\n\n".join(parts),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )

        db.table("conversaciones").upsert(
            {
                "id": conversacion_id,
                "clinic_id": clinic_id,
                "canal": "voz",
                "estado": "resuelta",
                "mensajes": mensajes,
            },
            on_conflict="id",
        ).execute()

        logger.info("Retell summary saved - clinic_id=%s call_id=%s", clinic_id, call_id)
    except Exception as e:
        logger.error("Error saving Retell summary: %s", e)
