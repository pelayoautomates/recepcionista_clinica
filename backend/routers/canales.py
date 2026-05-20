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
        "telefono, telefono_ia, whatsapp_number, retell_agent_id, twilio_whatsapp_number, "
        "google_tokens_enc, meta_waba_id, meta_phone_number_id, meta_phone_number"
    ).eq("id", str(clinic_id)).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")
    d = res.data
    twilio_num = d.get("twilio_whatsapp_number") or ""
    twilio_display = twilio_num.replace("whatsapp:", "") if twilio_num else None
    return {
        "telefono": d.get("telefono"),
        "telefono_ia": d.get("telefono_ia"),
        "whatsapp_number": d.get("whatsapp_number"),
        "retell_agent_id": d.get("retell_agent_id"),
        "tiene_numero_ia": bool(d.get("telefono_ia")),
        "twilio_whatsapp_number": twilio_display,
        "twilio_configured": bool(twilio_num),
        "sms_activo": bool(settings.telnyx_sms_number),
        "tiene_gcal": bool(d.get("google_tokens_enc")),
        "meta_waba_id": d.get("meta_waba_id"),
        "meta_phone_number_id": d.get("meta_phone_number_id"),
        "meta_phone_number": d.get("meta_phone_number"),
        "meta_configured": bool(d.get("meta_phone_number_id")),
    }


@router.post("/clinicas/{clinic_id}/canales/whatsapp/meta")
async def connect_whatsapp_meta(clinic_id: UUID, body: dict):
    """Intercambia el auth code de Meta Embedded Signup por token y guarda credenciales."""
    code = body.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Falta el código de autorización")
    if not settings.meta_app_id or not settings.meta_app_secret:
        raise HTTPException(status_code=503, detail="Meta App no configurada en el servidor")

    waba_id = body.get("waba_id")
    phone_number_id = body.get("phone_number_id")

    async with httpx.AsyncClient(timeout=20) as client:
        # 1. Intercambiar code por access token
        token_r = await client.get(
            f"https://graph.facebook.com/{settings.meta_graph_version}/oauth/access_token",
            params={
                "client_id": settings.meta_app_id,
                "client_secret": settings.meta_app_secret,
                "code": code,
            },
        )
        if token_r.status_code != 200:
            logger.error("Meta token exchange error: %s", token_r.text)
            raise HTTPException(status_code=502, detail="Error obteniendo token de Meta")
        access_token = token_r.json().get("access_token")
        if not access_token:
            raise HTTPException(status_code=502, detail="Meta no devolvió access token")

        # 2. Descubrir WABA si no vino del frontend
        if not waba_id:
            waba_r = await client.get(
                f"https://graph.facebook.com/{settings.meta_graph_version}/me/whatsapp_business_accounts",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"fields": "id,name"},
            )
            if waba_r.status_code == 200:
                data = waba_r.json().get("data", [])
                if data:
                    waba_id = data[0]["id"]

        # 3. Descubrir phone_number_id y número display
        phone_number = None
        if waba_id and not phone_number_id:
            phones_r = await client.get(
                f"https://graph.facebook.com/{settings.meta_graph_version}/{waba_id}/phone_numbers",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"fields": "id,display_phone_number"},
            )
            if phones_r.status_code == 200:
                phones = phones_r.json().get("data", [])
                if phones:
                    phone_number_id = phones[0]["id"]
                    phone_number = phones[0].get("display_phone_number")
        elif phone_number_id:
            phone_r = await client.get(
                f"https://graph.facebook.com/{settings.meta_graph_version}/{phone_number_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"fields": "display_phone_number"},
            )
            if phone_r.status_code == 200:
                phone_number = phone_r.json().get("display_phone_number")

        # 4. Suscribir webhook al WABA
        if waba_id:
            sub_r = await client.post(
                f"https://graph.facebook.com/{settings.meta_graph_version}/{waba_id}/subscribed_apps",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if sub_r.status_code not in (200, 201):
                logger.warning("Webhook subscription error para WABA %s: %s", waba_id, sub_r.text)

    # 5. Encriptar token con Fernet y guardar
    from cryptography.fernet import Fernet
    fernet = Fernet(settings.fernet_key.encode())
    encrypted_token = fernet.encrypt(access_token.encode()).decode()

    db = get_supabase()
    update: dict = {
        "meta_waba_id": waba_id,
        "meta_phone_number_id": phone_number_id,
        "meta_access_token": encrypted_token,
    }
    if phone_number:
        update["meta_phone_number"] = phone_number
    db.table("clinicas").update(update).eq("id", str(clinic_id)).execute()
    logger.info("Meta WhatsApp conectado para clínica %s — WABA %s / phone %s", clinic_id, waba_id, phone_number)
    return {"ok": True, "waba_id": waba_id, "phone_number_id": phone_number_id, "phone_number": phone_number}


@router.delete("/clinicas/{clinic_id}/canales/whatsapp/meta")
async def disconnect_whatsapp_meta(clinic_id: UUID):
    """Desconecta WhatsApp Meta Embedded Signup de la clínica."""
    db = get_supabase()
    db.table("clinicas").update({
        "meta_waba_id": None,
        "meta_phone_number_id": None,
        "meta_phone_number": None,
        "meta_access_token": None,
    }).eq("id", str(clinic_id)).execute()
    logger.info("Meta WhatsApp desconectado de clínica %s", clinic_id)
    return {"ok": True}



@router.get("/telnyx/numeros")
async def buscar_numeros_telnyx():
    """Devuelve los números ya comprados en la cuenta Telnyx que no están asignados a ninguna clínica."""
    if not settings.telnyx_api_key:
        raise HTTPException(status_code=503, detail="Telnyx no configurado")

    db = get_supabase()
    assigned_res = db.table("clinicas").select("telefono_ia").not_.is_("telefono_ia", "null").execute()
    assigned = {r["telefono_ia"] for r in (assigned_res.data or [])}

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(
            "https://api.telnyx.com/v2/phone_numbers",
            headers={"Authorization": f"Bearer {settings.telnyx_api_key}"},
            params={"page[size]": 100},
        )
        if r.status_code != 200:
            logger.error("Telnyx phone_numbers error %s: %s", r.status_code, r.text)
            raise HTTPException(status_code=502, detail=f"Error al obtener números de Telnyx: {r.text}")
        data = r.json()

    numeros = [item["phone_number"] for item in data.get("data", []) if item["phone_number"] not in assigned]
    return {"numeros": numeros}


async def _asignar_numero_a_clinica(clinic_id: str, telefono: str) -> dict:
    """Configura un número ya comprado en Telnyx: SIP + Retell + Supabase."""
    retell_agent_id = _get_retell_agent_id(clinic_id)
    telnyx_number_id: str | None = None

    async with httpx.AsyncClient(timeout=30) as client:
        # 1. Obtener ID interno Telnyx del número
        r0 = await client.get(
            f"https://api.telnyx.com/v2/phone_numbers/{telefono}",
            headers={"Authorization": f"Bearer {settings.telnyx_api_key}"},
        )
        if r0.status_code == 200:
            telnyx_number_id = r0.json().get("data", {}).get("id")

        # 2. Asignar conexión SIP
        if settings.telnyx_sip_connection_id:
            r2 = await client.patch(
                f"https://api.telnyx.com/v2/phone_numbers/{telefono}",
                headers={"Authorization": f"Bearer {settings.telnyx_api_key}", "Content-Type": "application/json"},
                json={"connection_id": settings.telnyx_sip_connection_id},
            )
            if r2.status_code not in (200, 201):
                logger.warning("Telnyx SIP assign error %s: %s", r2.status_code, r2.text)

        # 3. Importar en Retell (idempotente — si ya existe lo ignora)
        if settings.retell_api_key:
            r3 = await client.post(
                "https://api.retellai.com/phone-number/import",
                headers={"Authorization": f"Bearer {settings.retell_api_key}"},
                json={"phone_number": telefono, "termination_uri": settings.telnyx_sip_subdomain},
            )
            if r3.status_code not in (200, 201):
                logger.error("Retell import error %s: %s", r3.status_code, r3.text)
                raise HTTPException(status_code=502, detail=f"Error al importar número en Retell: {r3.text}")

            # 4. Asignar agente
            if retell_agent_id:
                r4 = await client.patch(
                    f"https://api.retellai.com/phone-number/{telefono}",
                    headers={"Authorization": f"Bearer {settings.retell_api_key}"},
                    json={"inbound_agent_id": retell_agent_id},
                )
                if r4.status_code not in (200, 201):
                    logger.warning("Retell assign agent error %s: %s", r4.status_code, r4.text)

    # 5. Guardar en Supabase
    db = get_supabase()
    update_data: dict = {"telefono_ia": telefono}
    if telnyx_number_id:
        update_data["telnyx_number_id"] = telnyx_number_id
    db.table("clinicas").update(update_data).eq("id", clinic_id).execute()
    logger.info("Número %s asignado a clínica %s (Telnyx ID: %s)", telefono, clinic_id, telnyx_number_id)
    return {"ok": True, "telefono_ia": telefono, "telnyx_number_id": telnyx_number_id}


@router.post("/clinicas/{clinic_id}/canales/voz/comprar")
async def comprar_numero(clinic_id: UUID, body: TelefonoBody):
    """Asigna a la clínica un número ya comprado en Telnyx (del pool propio)."""
    telefono = body.telefono.strip()
    if not settings.telnyx_api_key:
        raise HTTPException(status_code=503, detail="Telnyx no configurado")
    return await _asignar_numero_a_clinica(str(clinic_id), telefono)


@router.post("/clinicas/{clinic_id}/canales/voz/conectar")
async def conectar_numero(clinic_id: UUID, body: TelefonoBody):
    """Conecta un número Telnyx existente introducido manualmente."""
    telefono = body.telefono.strip()
    if not settings.telnyx_api_key:
        raise HTTPException(status_code=503, detail="Telnyx no configurado")
    return await _asignar_numero_a_clinica(str(clinic_id), telefono)


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
