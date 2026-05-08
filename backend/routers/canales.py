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
    """Query clinicas table by phone number; returns clinic_id or None."""
    try:
        db = get_supabase()
        res = db.table("clinicas").select("id").eq("telefono", telefono).limit(1).execute()
        if res.data:
            return res.data[0]["id"]
    except Exception as e:
        logger.warning("Error looking up clinic by phone %s: %s", telefono, e)
    return None


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/canales")
async def get_canales(clinic_id: UUID):
    """Devuelve el estado de los canales de una clínica."""
    db = get_supabase()
    res = db.table("clinicas").select("telefono, whatsapp_number").eq("id", str(clinic_id)).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")
    return {
        "telefono": res.data.get("telefono"),
        "whatsapp_number": res.data.get("whatsapp_number"),
    }


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


@router.post("/clinicas/{clinic_id}/canales/voz/conectar")
async def conectar_numero(clinic_id: UUID, body: TelefonoBody):
    """Importa un número existente a Retell y lo asocia a la clínica."""
    telefono = body.telefono.strip()
    if not settings.retell_api_key:
        raise HTTPException(status_code=503, detail="Retell no configurado")

    async with httpx.AsyncClient(timeout=20) as client:
        # 1. Import phone number into Retell
        import_payload: dict = {
            "phone_number": telefono,
            "termination_uri": settings.telnyx_sip_subdomain,
        }
        r = await client.post(
            "https://api.retellai.com/phone-number/import",
            headers={"Authorization": f"Bearer {settings.retell_api_key}"},
            json=import_payload,
        )
        if r.status_code not in (200, 201):
            logger.error("Retell import error %s: %s", r.status_code, r.text)
            raise HTTPException(status_code=502, detail=f"Error al importar número en Retell: {r.text}")

        # 2. Assign agent if configured
        if settings.retell_agent_id:
            r2 = await client.patch(
                f"https://api.retellai.com/phone-number/{telefono}",
                headers={"Authorization": f"Bearer {settings.retell_api_key}"},
                json={"inbound_agent_id": settings.retell_agent_id},
            )
            if r2.status_code not in (200, 201):
                logger.warning("Retell assign agent error %s: %s", r2.status_code, r2.text)

    # 3. Update Supabase
    db = get_supabase()
    db.table("clinicas").update({"telefono": telefono}).eq("id", str(clinic_id)).execute()
    logger.info("Número %s conectado a clínica %s", telefono, clinic_id)

    return {"ok": True, "telefono": telefono}


@router.post("/clinicas/{clinic_id}/canales/voz/comprar")
async def comprar_numero(clinic_id: UUID, body: TelefonoBody):
    """Compra un número de Telnyx, lo configura y lo conecta a Retell."""
    telefono = body.telefono.strip()
    if not settings.telnyx_api_key:
        raise HTTPException(status_code=503, detail="Telnyx no configurado")

    async with httpx.AsyncClient(timeout=30) as client:
        # 1. Order the number from Telnyx
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

        # 2. Assign SIP connection if configured
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

        # 3. Import into Retell
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

            # 4. Assign agent if configured
            if settings.retell_agent_id:
                r4 = await client.patch(
                    f"https://api.retellai.com/phone-number/{telefono}",
                    headers={"Authorization": f"Bearer {settings.retell_api_key}"},
                    json={"inbound_agent_id": settings.retell_agent_id},
                )
                if r4.status_code not in (200, 201):
                    logger.warning("Retell assign agent error %s: %s", r4.status_code, r4.text)

    # 5. Update Supabase
    db = get_supabase()
    db.table("clinicas").update({"telefono": telefono}).eq("id", str(clinic_id)).execute()
    logger.info("Número %s comprado y conectado a clínica %s", telefono, clinic_id)

    return {"ok": True, "telefono": telefono}


@router.delete("/clinicas/{clinic_id}/canales/voz")
async def desconectar_numero(clinic_id: UUID):
    """Desconecta el número de teléfono de la clínica (limpia el campo en Supabase)."""
    db = get_supabase()
    db.table("clinicas").update({"telefono": None}).eq("id", str(clinic_id)).execute()
    logger.info("Número desconectado de clínica %s", clinic_id)
    return {"ok": True}
