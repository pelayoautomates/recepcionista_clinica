import logging
from typing import Any

from fastapi import APIRouter, Request

from agent.core import run_agent

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("")
async def vapi_handler(request: Request):
    """
    Server URL handler para Vapi.ai.
    Vapi envía el mensaje del usuario y espera la respuesta del agente.
    Documentación: https://docs.vapi.ai/server-url
    """
    body: dict[str, Any] = await request.json()
    message = body.get("message", {})
    msg_type = message.get("type")

    if msg_type == "assistant-request":
        # Vapi solicita el primer mensaje del asistente
        clinic_id = _extract_clinic_id(body)
        if not clinic_id:
            return {"assistant": {"firstMessage": "Hola, bienvenido. ¿En qué puedo ayudarte?"}}

        from database.client import get_supabase
        db = get_supabase()
        clinica = db.table("clinicas").select("nombre").eq("id", clinic_id).single().execute()
        nombre = clinica.data.get("nombre", "la clínica")
        return {
            "assistant": {
                "firstMessage": f"Hola, gracias por llamar a {nombre}. ¿En qué puedo ayudarte hoy?"
            }
        }

    elif msg_type == "transcript":
        # Transcripción en tiempo real — ignorar (usamos function-call para respuestas)
        return {}

    elif msg_type == "function-call":
        # Vapi llama a una function — en nuestro caso usamos el endpoint de chat directo
        return {}

    elif msg_type == "end-of-call-report":
        # Llamada terminada: guardar resumen
        await _save_call_summary(body)
        return {}

    elif msg_type == "user-message":
        # Mensaje del usuario durante la llamada
        user_text = message.get("message", "")
        clinic_id = _extract_clinic_id(body)
        call_id = body.get("call", {}).get("id")

        if not clinic_id or not user_text:
            return {"assistant": {"message": "Lo siento, no te he entendido. ¿Puedes repetirlo?"}}

        respuesta, _ = await run_agent(
            clinic_id=clinic_id,
            conversacion_id=call_id,  # Usamos call_id como conversacion_id
            user_message=user_text,
            canal="voz",
        )
        return {"assistant": {"message": respuesta}}

    return {}


def _extract_clinic_id(body: dict) -> str | None:
    # El clinic_id se puede pasar en metadata del assistant de Vapi
    assistant = body.get("call", {}).get("assistant", {})
    metadata = assistant.get("metadata", {})
    return metadata.get("clinic_id")


async def _save_call_summary(body: dict) -> None:
    try:
        call = body.get("call", {})
        summary = body.get("summary", "")
        transcript = body.get("transcript", "")
        clinic_id = _extract_clinic_id(body)
        call_id = call.get("id")

        if not clinic_id:
            return

        from database.client import get_supabase
        db = get_supabase()

        # Buscar conversación por call_id (guardado como conversacion_id)
        # Si no existe, crear una nueva entrada
        db.table("conversaciones").upsert({
            "id": call_id,
            "clinic_id": clinic_id,
            "canal": "voz",
            "estado": "resuelta",
            "mensajes": [{"role": "system", "content": f"Resumen: {summary}\n\nTranscripción:\n{transcript}"}],
        }, on_conflict="id").execute()

        logger.info("Resumen de llamada guardado para clínica %s, call %s", clinic_id, call_id)
    except Exception as e:
        logger.error("Error guardando resumen de llamada: %s", e)
