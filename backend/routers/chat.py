import logging

from fastapi import APIRouter, HTTPException, Request

from agent.core import run_agent
from billing import MinutosAgotados, PlanInactivo, check_plan_active
from models.conversacion import ChatRequest
from rate_limit import limiter

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("")
@limiter.limit("30/minute")
async def chat(request: Request, body: ChatRequest):
    """
    Endpoint principal del chat web.
    Recibe un mensaje y devuelve la respuesta del agente.
    """
    # Verificar plan activo y límites
    try:
        check_plan_active(str(body.clinic_id))
    except PlanInactivo as e:
        raise HTTPException(status_code=402, detail={"error": "plan_inactivo", "motivo": e.motivo})
    except MinutosAgotados as e:
        raise HTTPException(status_code=402, detail={"error": "minutos_agotados", "usados": e.usados, "incluidos": e.incluidos})

    try:
        respuesta, conversacion_id = await run_agent(
            clinic_id=str(body.clinic_id),
            conversacion_id=str(body.conversacion_id) if body.conversacion_id else None,
            user_message=body.mensaje,
            canal="chat_web",
            paciente_id=str(body.paciente_id) if body.paciente_id else None,
        )
        return {
            "respuesta": respuesta,
            "conversacion_id": conversacion_id,
        }
    except Exception as e:
        logger.error("Error en /chat: %s", e)
        raise HTTPException(status_code=500, detail="Error procesando el mensaje")
