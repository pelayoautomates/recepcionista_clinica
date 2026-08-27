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
from webhook_dedupe import mark_webhook_event_once, release_webhook_event

logger = logging.getLogger(__name__)
router = APIRouter()
_warned_unprotected_ws = False

# Saludo de reserva, para cuando todavía no se sabe a qué clínica llamaron.
RETELL_AI_GREETING = (
    "Hola, soy Valeria, la asistente virtual con inteligencia artificial. "
    "¿En qué puedo ayudarte?"
)


def _saludo_para(clinic_id: str | None) -> str:
    """
    Primera frase de la llamada, con el nombre real de la clínica.

    Decía literalmente "de la clínica", sin nombre: suena a plantilla en la
    primera frase que oye el paciente. Se construye aquí y no en el prompt
    porque este saludo se envía antes de que intervenga el modelo.

    La identificación como IA es obligatoria (art. 50 del Reglamento de IA) y va
    siempre, se sepa el nombre o no.
    """
    if not clinic_id:
        return RETELL_AI_GREETING

    try:
        from database.client import get_supabase
        row = get_supabase().table("clinicas").select("nombre, agente_nombre").eq(
            "id", clinic_id
        ).single().execute().data or {}
    except Exception as exc:
        logger.warning("No se pudo leer el nombre de la clínica %s: %s", clinic_id, exc)
        return RETELL_AI_GREETING

    nombre_clinica = (row.get("nombre") or "").strip()
    agente = (row.get("agente_nombre") or "Valeria").strip()
    if not nombre_clinica:
        return (
            f"Hola, soy {agente}, la asistente virtual con inteligencia artificial. "
            "¿En qué puedo ayudarte?"
        )
    return (
        f"Hola, soy {agente}, la asistente virtual con inteligencia artificial "
        f"de {nombre_clinica}. ¿En qué puedo ayudarte?"
    )


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

    # Fallback: buscar clínica por telefono_ia (número Telnyx al que llamó el paciente)
    to_number = call.get("to_number") or call.get("to")
    if to_number:
        try:
            from database.client import get_supabase
            db = get_supabase()
            res = db.table("clinicas").select("id").eq("telefono_ia", to_number).limit(1).execute()
            if res.data:
                return res.data[0]["id"]
        except Exception:
            pass
    return None


def _conversation_id_from_call_id(call_id: str) -> str:
    # conversaciones.id is UUID and Retell call_id is an opaque string.
    # Use deterministic UUID so each call always maps to the same record.
    return str(uuid5(NAMESPACE_URL, f"retell:{call_id}"))


def _retell_response(response_id: int, content: str, content_complete: bool = True, end_call: bool = False, transfer_number: str | None = None) -> dict:
    r: dict = {
        "response_type": "response",
        "response_id": response_id,
        "content": content,
        "content_complete": content_complete,
        "end_call": end_call,
    }
    if transfer_number:
        r["transfer_number"] = transfer_number
    return r


def _get_transfer_number(
    clinic_id: str,
    conversacion_id: str | None,
    telefono_cache: dict | None = None,
) -> str | None:
    """
    Devuelve el telefono real de la clínica si la conversación está en esperando_humano.

    `telefono_cache` guarda el teléfono durante la llamada: el número de la clínica
    no cambia a mitad de conversación y esto ahorra una consulta por cada turno,
    que en voz se nota directamente en la latencia de respuesta.
    """
    if not conversacion_id:
        return None
    try:
        from database.client import get_supabase
        db = get_supabase()
        conv = db.table("conversaciones").select("estado").eq("id", conversacion_id).single().execute()
        if not conv.data or conv.data.get("estado") != "esperando_humano":
            return None

        if telefono_cache is not None and "telefono" in telefono_cache:
            telefono = telefono_cache["telefono"]
        else:
            clinic = db.table("clinicas").select("telefono").eq("id", clinic_id).single().execute()
            telefono = clinic.data.get("telefono") if clinic.data else None
            if telefono_cache is not None:
                telefono_cache["telefono"] = telefono

        if not telefono:
            return None
        from telnyx_sms import to_e164
        telefono_normalizado = to_e164(telefono)
        logger.info("Transfer activado — clínica %s → %s", clinic_id, telefono_normalizado)
        return telefono_normalizado
    except Exception as e:
        logger.error("Error obteniendo número de transfer: %s", e)
        return None


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


def _is_retell_ws_authorized(websocket: WebSocket) -> bool:
    global _warned_unprotected_ws
    secret = (settings.retell_ws_secret or "").strip()
    if not secret:
        if settings.is_production:
            if not _warned_unprotected_ws:
                logger.error("RETELL_WS_SECRET no configurado en producción: websocket Retell bloqueado")
                _warned_unprotected_ws = True
            return False
        return True

    query_token = (websocket.query_params.get("token") or "").strip()
    header_token = (websocket.headers.get("x-retell-ws-secret") or "").strip()
    provided = query_token or header_token
    return bool(provided) and hmac.compare_digest(provided, secret)


def _validate_clinic_agent_binding(clinic_id: str, agent_id: str | None) -> bool:
    if not clinic_id or not agent_id:
        return True

    from database.client import get_supabase
    db = get_supabase()
    row = db.table("clinicas").select("retell_agent_id").eq("id", clinic_id).limit(1).execute()
    expected_agent = (row.data[0].get("retell_agent_id") if row.data else None) or settings.retell_agent_id or None
    if not expected_agent:
        return True
    return expected_agent == agent_id


def _retell_event_key(event: str, call: dict) -> str:
    call_id = call.get("call_id") or "no_call_id"
    if event == "transcript_updated":
        transcript = call.get("transcript") or ""
        transcript_hash = hashlib.sha256(transcript.encode("utf-8")).hexdigest()[:24] if transcript else "no_transcript"
        end_ts = call.get("end_timestamp") or ""
        return f"{event}:{call_id}:{end_ts}:{transcript_hash}"

    call_status = call.get("call_status") or ""
    end_ts = call.get("end_timestamp") or ""
    summary = ((call.get("call_analysis") or {}).get("call_summary") or "").strip()
    summary_hash = hashlib.sha256(summary.encode("utf-8")).hexdigest()[:24] if summary else "no_summary"
    return f"{event}:{call_id}:{call_status}:{end_ts}:{summary_hash}"


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
    if not _is_retell_ws_authorized(websocket):
        await websocket.close(code=1008)
        return

    await websocket.accept()

    call_id = path_call_id
    clinic_id = None
    conversacion_id = _conversation_id_from_call_id(call_id) if call_id else None
    last_validated_pair: tuple[str, str] | None = None
    telefono_cache: dict = {}

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
    # El saludo NO se manda aquí: al abrir el socket todavía no se sabe a qué
    # clínica llamó el paciente, y decir "la clínica" sin nombre suena a plantilla
    # en la primera frase. Se envía al recibir `call_details`, que es cuando Retell
    # informa de la llamada (por eso se pide `call_details: true` en el config).
    saludo_enviado = False

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
                agent_id = call.get("agent_id")
                if clinic_id and agent_id:
                    pair = (clinic_id, agent_id)
                    if pair != last_validated_pair:
                        if not _validate_clinic_agent_binding(clinic_id, agent_id):
                            logger.warning("Retell WS agent/clinic mismatch - call_id=%s clinic_id=%s agent_id=%s", call_id, clinic_id, agent_id)
                            await websocket.close(code=1008)
                            return
                        last_validated_pair = pair
                if call_id and not conversacion_id:
                    conversacion_id = _conversation_id_from_call_id(call_id)

                if clinic_id and conversacion_id:
                    _ensure_conversation_exists(clinic_id, conversacion_id)

                if not saludo_enviado:
                    await websocket.send_text(
                        json.dumps(
                            _retell_response(
                                response_id=0,
                                content=_saludo_para(clinic_id),
                                content_complete=True,
                            )
                        )
                    )
                    saludo_enviado = True

                logger.info("Retell call started - call_id=%s clinic_id=%s", call_id, clinic_id)
                continue

            if interaction_type == "update_only":
                continue

            if interaction_type not in ("response_required", "reminder_required"):
                continue

            response_id = int(message.get("response_id") or 0)
            call = message.get("call", {})
            transcript: list = message.get("transcript", [])

            if not saludo_enviado:
                # `call_details` no llegó. Antes que dejar al paciente en silencio,
                # se saluda con lo que se sepa; sin identificarse como IA la
                # llamada no puede seguir (art. 50 del Reglamento de IA).
                await websocket.send_text(
                    json.dumps(
                        _retell_response(
                            response_id=response_id,
                            content=_saludo_para(clinic_id or _extract_clinic_id(call, message)),
                            content_complete=True,
                        )
                    )
                )
                saludo_enviado = True
                continue

            if not clinic_id:
                clinic_id = _extract_clinic_id(call, message)
            if not call_id:
                call_id = call.get("call_id")
            if call_id and not conversacion_id:
                conversacion_id = _conversation_id_from_call_id(call_id)
            agent_id = call.get("agent_id")
            if clinic_id and agent_id:
                pair = (clinic_id, agent_id)
                if pair != last_validated_pair:
                    if not _validate_clinic_agent_binding(clinic_id, agent_id):
                        logger.warning("Retell WS agent/clinic mismatch - call_id=%s clinic_id=%s agent_id=%s", call_id, clinic_id, agent_id)
                        await websocket.close(code=1008)
                        return
                    last_validated_pair = pair

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
                from billing import MinutosAgotados, PlanInactivo
                if isinstance(e, (PlanInactivo, MinutosAgotados)):
                    respuesta = "Ahora mismo no puedo atender automáticamente. Te paso con el equipo de la clínica."
                else:
                    logger.error("Error in agent - call=%s: %s", call_id, e, exc_info=True)
                    respuesta = "Disculpa, ha ocurrido un problema. Puedes repetir lo que necesitas?"

            transfer_number = (
                _get_transfer_number(clinic_id, conversacion_id, telefono_cache) if clinic_id else None
            )
            await websocket.send_text(
                json.dumps(
                    _retell_response(
                        response_id=response_id,
                        content=respuesta,
                        content_complete=True,
                        end_call=False,
                        transfer_number=transfer_number,
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

    if settings.is_production and not settings.retell_api_key:
        raise HTTPException(status_code=503, detail="Firma Retell no configurada")
    if settings.retell_api_key:
        signature = request.headers.get("x-retell-signature", "")
        if not _verify_retell_signature(raw_text, signature, settings.retell_api_key):
            raise HTTPException(status_code=401, detail="Invalid Retell signature")

    body = json.loads(raw_text)
    event = body.get("event")
    call = body.get("call", {})
    event_key = _retell_event_key(event or "unknown", call or {})
    if not mark_webhook_event_once("retell", event_key, raw_text):
        return {"ok": True}

    try:
        if event == "call_ended":
            await _cobrar_minutos_llamada(call)

        if event in ("call_ended", "call_analyzed", "transcript_updated"):
            await _save_call_summary(call)
    except Exception as exc:
        try:
            release_webhook_event("retell", event_key)
        except Exception:
            logger.exception("No se pudo liberar el evento Retell fallido")
        raise HTTPException(status_code=503, detail="Error temporal procesando llamada") from exc

    return {"ok": True}


async def _cobrar_minutos_llamada(call: dict) -> None:
    """
    Descuenta del plan los minutos reales de la llamada.
    Es el único punto donde se consumen minutos: el chat web y WhatsApp
    verifican el plan pero no gastan minutos.
    """
    call_id = call.get("call_id")
    clinic_id = _extract_clinic_id(call)
    if not call_id or not clinic_id:
        logger.warning("call_ended sin call_id/clinic_id — no se facturan minutos")
        return

    billing_key = f"minutos:{call_id}"
    if not mark_webhook_event_once("retell_billing", billing_key):
        return

    try:
        duracion_ms = call.get("duration_ms")
        if duracion_ms is None:
            inicio = call.get("start_timestamp")
            fin = call.get("end_timestamp")
            if inicio and fin:
                duracion_ms = fin - inicio

        from billing import incrementar_minutos, minutos_de_llamada

        minutos = minutos_de_llamada(duracion_ms)
        if minutos <= 0:
            return

        await incrementar_minutos(clinic_id, minutos)
        logger.info("Facturados %s min a clínica %s (call %s)", minutos, clinic_id, call_id)
    except Exception:
        release_webhook_event("retell_billing", billing_key)
        raise


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
