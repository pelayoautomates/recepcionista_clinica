import logging

from fastapi import APIRouter, HTTPException

from agent.core import run_agent
from models.conversacion import ChatRequest

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("")
async def chat(request: ChatRequest):
    """
    Endpoint principal del chat web.
    Recibe un mensaje y devuelve la respuesta del agente.
    """
    try:
        respuesta, conversacion_id = await run_agent(
            clinic_id=str(request.clinic_id),
            conversacion_id=str(request.conversacion_id) if request.conversacion_id else None,
            user_message=request.mensaje,
            canal="chat_web",
            paciente_id=str(request.paciente_id) if request.paciente_id else None,
        )
        return {
            "respuesta": respuesta,
            "conversacion_id": conversacion_id,
        }
    except Exception as e:
        logger.error("Error en /chat: %s", e)
        raise HTTPException(status_code=500, detail="Error procesando el mensaje")
