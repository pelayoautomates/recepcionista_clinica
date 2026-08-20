"""
Gestión de agentes de Retell.

Modelo actual: UN SOLO AGENTE ("Valeria") compartido por todas las clínicas,
configurado en la variable de entorno RETELL_AGENT_ID.

Funciona porque la clínica se identifica por el número al que llama el paciente
(`to_number` → `clinicas.telefono_ia`), no por el agente. El cerebro de cada
clínica —servicios, horarios, tono, base de conocimiento— se construye en el
servidor en `agent/prompts.build_system_prompt` a partir del clinic_id.

Las funciones de crear/actualizar agentes se conservan para uso puntual desde
`/admin/clinicas/{id}/retell/agent` (por ejemplo, si algún cliente quisiera una
voz distinta), pero el alta de una clínica ya no crea agentes.
"""
import logging
from urllib.parse import quote_plus

import httpx

from config import settings

logger = logging.getLogger(__name__)

RETELL_API_BASE = "https://api.retellai.com"


def get_global_agent_id() -> str | None:
    """
    Agente único de la plataforma. Es el que atiende a todas las clínicas.
    Si devuelve None, el canal de voz no puede activarse para nadie.
    """
    return (settings.retell_agent_id or "").strip() or None


def _voice_id() -> str:
    """Voz del agente. Configurable por env para poder cambiarla sin deploy de código."""
    return settings.retell_voice_id or "11labs-Adrian"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.retell_api_key}",
        "Content-Type": "application/json",
    }


def _websocket_url() -> str:
    """LLM WebSocket URL that Retell will call for this agent."""
    base = settings.base_url.replace("https://", "wss://").replace("http://", "ws://")
    url = f"{base}/retell/llm-websocket"
    if settings.retell_ws_secret:
        return f"{url}?token={quote_plus(settings.retell_ws_secret)}"
    return url


async def create_agent_for_clinic(clinic_id: str, clinic_name: str) -> str:
    """
    Creates a Retell agent for a clinic. Returns the agent_id.
    Raises on failure.
    """
    if not settings.retell_api_key:
        raise ValueError("RETELL_API_KEY not configured")

    # La API de Retell exige response_engine (objeto anidado) + voice_id.
    # llm_websocket_url NO va en el nivel raíz: va dentro de response_engine.
    payload = {
        "response_engine": {
            "type": "custom-llm",
            "llm_websocket_url": _websocket_url(),
        },
        "voice_id": _voice_id(),
        "agent_name": f"Recepcionista — {clinic_name}",
        "language": "es-ES",
        "responsiveness": 1.0,
        "enable_backchannel": False,
        "metadata": {"clinic_id": clinic_id},
        "end_call_after_silence_ms": 30000,
        "max_call_duration_ms": 1800000,  # 30 min max
    }

    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post(f"{RETELL_API_BASE}/create-agent", json=payload, headers=_headers())
        if res.status_code >= 400:
            logger.error("Retell create-agent %s: %s", res.status_code, res.text)
        res.raise_for_status()
        data = res.json()

    agent_id = data.get("agent_id") or data.get("id")
    if not agent_id:
        raise ValueError(f"Retell did not return agent_id: {data}")

    logger.info("Retell agent created: %s for clinic %s", agent_id, clinic_id)
    return agent_id


async def update_agent_for_clinic(agent_id: str, clinic_id: str, clinic_name: str) -> None:
    """Updates an existing Retell agent (e.g. after clinic rename)."""
    if not settings.retell_api_key:
        raise ValueError("RETELL_API_KEY not configured")

    payload = {
        "response_engine": {
            "type": "custom-llm",
            "llm_websocket_url": _websocket_url(),
        },
        "agent_name": f"Recepcionista — {clinic_name}",
        "metadata": {"clinic_id": clinic_id},
    }

    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.patch(
            f"{RETELL_API_BASE}/update-agent/{agent_id}",
            json=payload,
            headers=_headers(),
        )
        if res.status_code >= 400:
            logger.error("Retell update-agent %s: %s", res.status_code, res.text)
        res.raise_for_status()

    logger.info("Retell agent updated: %s for clinic %s", agent_id, clinic_id)


async def delete_agent(agent_id: str) -> None:
    if not settings.retell_api_key:
        return
    async with httpx.AsyncClient(timeout=10) as client:
        await client.delete(f"{RETELL_API_BASE}/delete-agent/{agent_id}", headers=_headers())
    logger.info("Retell agent deleted: %s", agent_id)


async def get_agent(agent_id: str) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(f"{RETELL_API_BASE}/get-agent/{agent_id}", headers=_headers())
        res.raise_for_status()
        return res.json()


async def provision_clinic_agent(clinic_id: str, clinic_name: str) -> str:
    """
    Ensures a clinic has a Retell agent. Creates if missing, returns agent_id.
    Also saves agent_id to the clinicas table.
    """
    from database.client import get_supabase

    db = get_supabase()
    row = db.table("clinicas").select("retell_agent_id, nombre").eq("id", clinic_id).single().execute()
    existing_agent_id = (row.data or {}).get("retell_agent_id")

    if existing_agent_id:
        # Keep websocket URL/metadata synced (e.g. when enabling RETELL_WS_SECRET)
        try:
            await update_agent_for_clinic(existing_agent_id, clinic_id, clinic_name)
        except Exception as e:
            logger.warning("Could not refresh Retell agent %s for clinic %s: %s", existing_agent_id, clinic_id, e)
        logger.info("Clinic %s already has Retell agent %s", clinic_id, existing_agent_id)
        return existing_agent_id

    agent_id = await create_agent_for_clinic(clinic_id, clinic_name)
    db.table("clinicas").update({"retell_agent_id": agent_id}).eq("id", clinic_id).execute()
    return agent_id
