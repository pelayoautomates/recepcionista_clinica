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


class ActivarVozBody(BaseModel):
    telefono_clinica: str          # el número real que ya tiene el negocio
    routing_mode: str = "siempre"  # siempre | fuera_horario | si_no_contestan
    segundos_desvio: int = 20      # solo aplica a si_no_contestan (y solo en móvil)
    tipo_linea: str = "movil"      # movil | fijo — cambia la sintaxis del código


ROUTING_MODES = {"siempre", "fuera_horario", "si_no_contestan"}


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


async def _get_retell_agent_id(clinic_id: str) -> str | None:
    """
    Devuelve el agente Retell que debe atender las llamadas de esta clínica.

    Modelo de agente único (Valeria): TODAS las clínicas comparten el mismo agente
    de Retell. La clínica se identifica por el número al que llamó el paciente
    (`to_number` → `clinicas.telefono_ia`), no por el agente, y su personalidad,
    servicios y horarios se construyen en `build_system_prompt` a partir del
    clinic_id. Ver `retell_manager.get_global_agent_id`.

    Se respeta un `retell_agent_id` propio si una clínica lo tiene guardado (altas
    antiguas, o un cliente que en el futuro quiera voz distinta).
    """
    db = get_supabase()
    try:
        res = db.table("clinicas").select("retell_agent_id").eq("id", clinic_id).single().execute()
        propio = (res.data or {}).get("retell_agent_id")
        if propio:
            return propio
    except Exception as e:
        logger.warning("Error fetching retell_agent_id for clinic %s: %s", clinic_id, e)

    from retell_manager import get_global_agent_id
    return get_global_agent_id()


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/clinicas/{clinic_id}/canales")
async def get_canales(clinic_id: UUID):
    """Devuelve el estado de los canales de una clínica."""
    db = get_supabase()
    res = db.table("clinicas").select(
        "telefono, telefono_ia, whatsapp_number, retell_agent_id, twilio_whatsapp_number, "
        "google_tokens_enc, meta_waba_id, meta_phone_number_id, meta_phone_number, routing_mode"
    ).eq("id", str(clinic_id)).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")
    d = res.data
    routing_mode = d.get("routing_mode") or "siempre"
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
        "routing_mode": routing_mode,
        # Códigos que el negocio marca en su teléfono para desviar a la IA.
        "desvio": _codigos_desvio(d["telefono_ia"], routing_mode) if d.get("telefono_ia") else None,
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
                logger.error("Webhook subscription error para WABA %s: %s", waba_id, sub_r.text)
                raise HTTPException(status_code=502, detail="Meta no pudo suscribir el webhook de WhatsApp")

    if not waba_id or not phone_number_id:
        raise HTTPException(
            status_code=502,
            detail="Meta no devolvió la cuenta y el número necesarios para activar WhatsApp",
        )

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
    if not settings.retell_api_key:
        raise HTTPException(status_code=503, detail="Retell no está configurado")
    if not settings.telnyx_sip_connection_id:
        raise HTTPException(status_code=503, detail="La conexión SIP de Telnyx no está configurada")
    retell_agent_id = await _get_retell_agent_id(clinic_id)
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
        r2 = await client.patch(
            f"https://api.telnyx.com/v2/phone_numbers/{telefono}",
            headers={"Authorization": f"Bearer {settings.telnyx_api_key}", "Content-Type": "application/json"},
            json={"connection_id": settings.telnyx_sip_connection_id},
        )
        if r2.status_code not in (200, 201):
            logger.error("Telnyx SIP assign error %s: %s", r2.status_code, r2.text)
            raise HTTPException(status_code=502, detail="No se pudo conectar el número a la troncal SIP")

        # 3. Importar en Retell (idempotente — si ya existe lo ignora)
        if settings.retell_api_key:
            r3 = await client.post(
                "https://api.retellai.com/import-phone-number",
                headers={"Authorization": f"Bearer {settings.retell_api_key}"},
                json={"phone_number": telefono, "termination_uri": settings.telnyx_sip_subdomain},
            )
            if r3.status_code not in (200, 201):
                logger.error("Retell import error %s: %s", r3.status_code, r3.text)
                raise HTTPException(status_code=502, detail=f"Error al importar número en Retell: {r3.text}")

            # 4. Asignar agente. Sin agente el número suena pero nadie contesta,
            #    así que se falla en alto en vez de guardar un canal roto.
            if not retell_agent_id:
                raise HTTPException(
                    status_code=502,
                    detail="No se pudo crear el agente de voz de esta clínica. "
                           "Revisa RETELL_API_KEY e inténtalo de nuevo.",
                )
            r4 = await client.patch(
                f"https://api.retellai.com/update-phone-number/{telefono}",
                headers={"Authorization": f"Bearer {settings.retell_api_key}"},
                json={"inbound_agent_id": retell_agent_id},
            )
            if r4.status_code not in (200, 201):
                logger.error("Retell assign agent error %s: %s", r4.status_code, r4.text)
                raise HTTPException(
                    status_code=502,
                    detail=f"El número se importó pero no se pudo asignar al agente: {r4.text}",
                )

    # 5. Guardar en Supabase
    db = get_supabase()
    update_data: dict = {"telefono_ia": telefono}
    if telnyx_number_id:
        update_data["telnyx_number_id"] = telnyx_number_id
    db.table("clinicas").update(update_data).eq("id", clinic_id).execute()
    logger.info("Número %s asignado a clínica %s (Telnyx ID: %s)", telefono, clinic_id, telnyx_number_id)
    return {"ok": True, "telefono_ia": telefono, "telnyx_number_id": telnyx_number_id}


def _codigos_desvio(destino: str, routing_mode: str, segundos: int = 20, tipo_linea: str = "movil") -> dict:
    """
    Códigos que el negocio marca en SU propio teléfono para que las llamadas que
    no coge lleguen a la IA. El paciente no marca nada y el número de la clínica
    no cambia.

    La sintaxis depende del tipo de línea, y esto importa porque casi todas las
    clínicas tienen fijo:

    - **Móvil**: sintaxis GSM completa `**61*<destino>*11*<segundos>#`, donde 11
      es el servicio de voz. Permite elegir los segundos de espera.
    - **Fijo**: `*61*<destino>#`, con un solo asterisco y **sin** poder fijar los
      segundos — el tiempo lo decide la operadora. Además suele ser un servicio
      de pago (Movistar lo cobra aparte).

    Antes se devolvía siempre la sintaxis de móvil, así que a una clínica con
    fijo se le daba un código que no le iba a funcionar.
    """
    seg = max(5, min(30, int(segundos or 20)))
    es_fijo = tipo_linea == "fijo"

    if routing_mode == "si_no_contestan":
        if es_fijo:
            activar = f"*61*{destino}#"
            explicacion = (
                "Las llamadas suenan primero en la clínica y, si nadie contesta, "
                "entra la IA. En un fijo el tiempo de espera lo fija la operadora: "
                "no se puede elegir desde el teléfono."
            )
        else:
            activar = f"**61*{destino}*11*{seg}#"
            explicacion = (
                f"Las llamadas suenan primero en la clínica. Si nadie contesta en {seg} "
                "segundos, entra la IA."
            )
    elif routing_mode == "fuera_horario":
        activar = f"*21*{destino}#" if es_fijo else f"**21*{destino}#"
        explicacion = (
            "Desvío total: actívalo al cerrar y desactívalo al abrir. La IA ya sabe "
            "que la clínica está cerrada y lo explica al paciente."
        )
    else:  # siempre
        activar = f"*21*{destino}#" if es_fijo else f"**21*{destino}#"
        explicacion = "Todas las llamadas entran directamente a la IA, 24/7."

    desactivar = "#61#" if (es_fijo and routing_mode == "si_no_contestan") else (
        "#21#" if es_fijo else "##002#"
    )

    aviso = None
    if es_fijo:
        aviso = (
            "En línea fija el desvío suele ser un servicio de pago de la operadora "
            "(en Movistar, unos 4 €/mes). Si la clínica tiene centralita, el desvío "
            "se configura dentro de la centralita, no con estos códigos."
        )

    return {
        "activar": activar,
        "desactivar": desactivar,
        "explicacion": explicacion,
        "tipo_linea": tipo_linea,
        "aviso": aviso,
        "segundos": seg if (routing_mode == "si_no_contestan" and not es_fijo) else None,
    }


@router.post("/clinicas/{clinic_id}/canales/voz/activar")
async def activar_voz(clinic_id: UUID, body: ActivarVozBody):
    """
    Activa el canal de voz sin que el negocio compre ni cambie de número.

    Toma automáticamente un número libre del pool de Telnyx de la agencia, lo
    conecta al agente único, y devuelve el código de desvío que el negocio marca
    en su propio teléfono. El cliente conserva su número de siempre.
    """
    if not settings.telnyx_api_key:
        raise HTTPException(status_code=503, detail="Telnyx no configurado")

    routing_mode = (body.routing_mode or "siempre").strip()
    if routing_mode not in ROUTING_MODES:
        raise HTTPException(status_code=400, detail=f"routing_mode no válido: {routing_mode}")

    telefono_clinica = body.telefono_clinica.strip()
    if not telefono_clinica:
        raise HTTPException(status_code=400, detail="Falta el teléfono de la clínica")

    db = get_supabase()

    # ¿Ya tiene número asignado? Entonces solo se actualiza el desvío.
    actual = db.table("clinicas").select("telefono_ia").eq("id", str(clinic_id)).single().execute()
    numero_ia = (actual.data or {}).get("telefono_ia")

    if not numero_ia:
        disponibles = await buscar_numeros_telnyx()
        numeros = disponibles.get("numeros") or []
        if not numeros:
            raise HTTPException(
                status_code=409,
                detail="No quedan números libres en el pool de Telnyx. Compra más números "
                       "en Telnyx antes de dar de alta este canal.",
            )
        numero_ia = numeros[0]
        await _asignar_numero_a_clinica(str(clinic_id), numero_ia)

    db.table("clinicas").update({
        "telefono": telefono_clinica,
        "routing_mode": routing_mode,
    }).eq("id", str(clinic_id)).execute()

    logger.info(
        "Voz activada para clínica %s — número IA %s, desvío desde %s, modo %s",
        clinic_id, numero_ia, telefono_clinica, routing_mode,
    )

    return {
        "ok": True,
        "telefono_ia": numero_ia,
        "telefono_clinica": telefono_clinica,
        "routing_mode": routing_mode,
        "desvio": _codigos_desvio(numero_ia, routing_mode, body.segundos_desvio, body.tipo_linea),
    }


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
    """Desconecta el número IA de la clínica: limpia Retell, Supabase."""
    db = get_supabase()
    row = db.table("clinicas").select("telefono_ia").eq("id", str(clinic_id)).single().execute()
    telefono = (row.data or {}).get("telefono_ia")

    if telefono and settings.retell_api_key:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.delete(
                f"https://api.retellai.com/delete-phone-number/{telefono}",
                headers={"Authorization": f"Bearer {settings.retell_api_key}"},
            )
            if r.status_code not in (200, 204):
                logger.warning("Retell delete phone error %s: %s", r.status_code, r.text)

    db.table("clinicas").update({
        "telefono_ia": None,
        "telnyx_number_id": None,
    }).eq("id", str(clinic_id)).execute()
    logger.info("Número IA %s desconectado de clínica %s", telefono, clinic_id)
    return {"ok": True}
