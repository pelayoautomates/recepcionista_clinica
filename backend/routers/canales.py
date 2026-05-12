import logging
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from config import settings
from database.client import get_supabase
from security import require_admin_key

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_admin_key)])


# ─── Models ──────────────────────────────────────────────────────────────────

class TelefonoBody(BaseModel):
    telefono: str


# ─── Helper ──────────────────────────────────────────────────────────────────

def _lookup_clinic_by_phone(telefono: str) -> str | None:
    """Busca una clínica por su número IA (telefono_ia). Usado para enrutar llamadas entrantes."""
    try:
        db = get_supabase()
        res = db.table("clinicas").select("id").eq("telefono_ia", telefono).limit(1).execute()
        if res.data:
            return res.data[0]["id"]
    except Exception as e:
        logger.warning("Error looking up clinic by telefono_ia %s: %s", telefono, e)
    return None


def _get_retell_agent_id(clinic_id: str) -> str | None:
    """Devuelve el retell_agent_id de la clínica; cae back al global si no tiene uno propio."""
    try:
        db = get_supabase()
        res = db.table("clinicas").select("retell_agent_id").eq("id", clinic_id).single().execute()
        if res.data and res.data.get("retell_agent_id"):
            return res.data["retell_agent_id"]
    except Exception as e:
        logger.warning("Error fetching retell_agent_id for clinic %s: %s", clinic_id, e)
    # Fallback al agente global de la plataforma (configurado en Railway)
    return settings.retell_agent_id or None


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/canales")
async def get_canales(clinic_id: UUID):
    """Devuelve el estado de los canales de una clínica."""
    db = get_supabase()
    res = db.table("clinicas").select(
        "telefono, telefono_ia, whatsapp_number, retell_agent_id, twilio_whatsapp_number"
    ).eq("id", str(clinic_id)).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")
    d = res.data
    twilio_num = d.get("twilio_whatsapp_number") or ""
    # Strip "whatsapp:" prefix for display
    twilio_display = twilio_num.replace("whatsapp:", "") if twilio_num else None
    return {
        "telefono": d.get("telefono"),
        "telefono_ia": d.get("telefono_ia"),
        "whatsapp_number": d.get("whatsapp_number"),
        "retell_agent_id": d.get("retell_agent_id"),
        "tiene_numero_ia": bool(d.get("telefono_ia")),
        "twilio_whatsapp_number": twilio_display,
        "twilio_configured": bool(twilio_num),
    }


@router.patch("/clinicas/{clinic_id}/canales/360dialog")
async def configure_360dialog(clinic_id: UUID, body: dict):
    """Guarda credenciales 360dialog para una clínica."""
    allowed = {"dialog360_api_key", "dialog360_phone_id", "dialog360_waba_id"}
    update = {k: v for k, v in body.items() if k in allowed and v}
    if not update:
        raise HTTPException(status_code=400, detail="No hay campos válidos")
    db = get_supabase()
    db.table("clinicas").update(update).eq("id", str(clinic_id)).execute()
    return {"ok": True}


@router.delete("/clinicas/{clinic_id}/canales/360dialog")
async def disconnect_360dialog(clinic_id: UUID):
    """Elimina credenciales 360dialog de una clínica."""
    db = get_supabase()
    db.table("clinicas").update({
        "dialog360_api_key": None, "dialog360_phone_id": None, "dialog360_waba_id": None,
    }).eq("id", str(clinic_id)).execute()
    return {"ok": True}


@router.get("/telnyx/numeros")
async def buscar_numeros_telnyx(pais: str = "ES", area_code: str = ""):
    """Busca números disponibles en Telnyx para el país indicado."""
    if not settings.telnyx_api_key:
        raise HTTPException(status_code=503, detail="Telnyx no configurado")

    params: dict = {
        "filter[country_code]": pais,
        "filter[phone_number_type]": "local",
        "filter[features][]": "voice",
        "page[size]": 20,
    }
    if area_code:
        params["filter[national_destination_code]"] = area_code

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            "https://api.telnyx.com/v2/available_phone_numbers",
            headers={"Authorization": f"Bearer {settings.telnyx_api_key}"},
            params=params,
        )
        if r.status_code != 200:
            logger.error("Telnyx search error %s: %s", r.status_code, r.text)
            raise HTTPException(status_code=502, detail=f"Error al buscar números en Telnyx: {r.text}")
        data = r.json()

    numeros = [item["phone_number"] for item in data.get("data", [])]
    return {"numeros": numeros}


@router.post("/clinicas/{clinic_id}/canales/voz/comprar")
async def comprar_numero(clinic_id: UUID, body: TelefonoBody):
    """Compra un número de Telnyx, lo configura y lo conecta a Retell."""
    telefono = body.telefono.strip()
    if not settings.telnyx_api_key:
        raise HTTPException(status_code=503, detail="Telnyx no configurado")

    retell_agent_id = _get_retell_agent_id(str(clinic_id))
    telnyx_number_id: str | None = None

    async with httpx.AsyncClient(timeout=30) as client:
        # 1. Comprar el número en Telnyx
        r = await client.post(
            "https://api.telnyx.com/v2/number_orders",
            headers={
                "Authorization": f"Bearer {settings.telnyx_api_key}",
                "Content-Type": "application/json",
            },
            json={"phone_numbers": [{"phone_number": telefono}]},
        )
        if r.status_code not in (200, 201):
            logger.error("Telnyx order error %s: %s", r.status_code, r.text)
            raise HTTPException(status_code=502, detail=f"Error al comprar número en Telnyx: {r.text}")

        order_data = r.json()
        # Guardar el ID de Telnyx para gestión futura (cancelar, transferir, etc.)
        phone_numbers = order_data.get("data", {}).get("phone_numbers", [])
        if phone_numbers:
            telnyx_number_id = phone_numbers[0].get("id")

        # 2. Asignar conexión SIP de Telnyx
        if settings.telnyx_sip_connection_id:
            r2 = await client.patch(
                f"https://api.telnyx.com/v2/phone_numbers/{telefono}",
                headers={
                    "Authorization": f"Bearer {settings.telnyx_api_key}",
                    "Content-Type": "application/json",
                },
                json={"connection_id": settings.telnyx_sip_connection_id},
            )
            if r2.status_code not in (200, 201):
                logger.warning("Telnyx SIP assign error %s: %s", r2.status_code, r2.text)

        # 3. Importar en Retell
        if settings.retell_api_key:
            r3 = await client.post(
                "https://api.retellai.com/phone-number/import",
                headers={"Authorization": f"Bearer {settings.retell_api_key}"},
                json={
                    "phone_number": telefono,
                    "termination_uri": settings.telnyx_sip_subdomain,
                },
            )
            if r3.status_code not in (200, 201):
                logger.error("Retell import error %s: %s", r3.status_code, r3.text)
                raise HTTPException(status_code=502, detail=f"Error al importar número en Retell: {r3.text}")

            # 4. Asignar agente (per-clínica o global)
            if retell_agent_id:
                r4 = await client.patch(
                    f"https://api.retellai.com/phone-number/{telefono}",
                    headers={"Authorization": f"Bearer {settings.retell_api_key}"},
                    json={"inbound_agent_id": retell_agent_id},
                )
                if r4.status_code not in (200, 201):
                    logger.warning("Retell assign agent error %s: %s", r4.status_code, r4.text)

    # 5. Guardar en Supabase — usar telefono_ia (no telefono)
    db = get_supabase()
    update_data: dict = {"telefono_ia": telefono}
    if telnyx_number_id:
        update_data["telnyx_number_id"] = telnyx_number_id
    db.table("clinicas").update(update_data).eq("id", str(clinic_id)).execute()
    logger.info("Número %s comprado y conectado a clínica %s (Telnyx ID: %s)", telefono, clinic_id, telnyx_number_id)

    return {"ok": True, "telefono_ia": telefono, "telnyx_number_id": telnyx_number_id}


@router.delete("/clinicas/{clinic_id}/canales/voz")
async def desconectar_numero(clinic_id: UUID):
    """Desconecta el número IA de la clínica (limpia los campos en Supabase)."""
    db = get_supabase()
    db.table("clinicas").update({
        "telefono_ia": None,
        "telnyx_number_id": None,
    }).eq("id", str(clinic_id)).execute()
    logger.info("Número IA desconectado de clínica %s", clinic_id)
    return {"ok": True}
