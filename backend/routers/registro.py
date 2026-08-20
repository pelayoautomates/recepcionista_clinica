import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from database.client import get_supabase
from security import require_admin_key

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_admin_key)])

TRIAL_DAYS = 7


class RegistroClinicaRequest(BaseModel):
    user_id: str
    email: str
    nombre: str
    especialidad: str | None = None
    url_web: str | None = None
    telefono: str | None = None


class DemoRequest(BaseModel):
    clinic_name: str
    website: str | None = None
    email: str
    phone: str | None = None
    specialty: str | None = None
    channels: list[str] = Field(default_factory=list)
    notes: str | None = None
    source: str = "website"
    attribution: dict = Field(default_factory=dict)
    privacy_accepted: bool


@router.post("/demo-requests", status_code=201)
async def create_demo_request(data: DemoRequest):
    """Guarda una solicitud de demo validada por el proxy publico del dashboard."""
    clinic_name = data.clinic_name.strip()
    email = data.email.strip().lower()
    if data.privacy_accepted is not True:
        raise HTTPException(status_code=400, detail="Debes aceptar la política de privacidad")
    if not clinic_name or len(clinic_name) > 160:
        raise HTTPException(status_code=400, detail="Nombre de clinica no valido")
    if "@" not in email or len(email) > 254:
        raise HTTPException(status_code=400, detail="Email no valido")

    row = {
        "clinic_name": clinic_name,
        "website": (data.website or "").strip()[:500] or None,
        "email": email,
        "phone": (data.phone or "").strip()[:50] or None,
        "specialty": (data.specialty or "").strip()[:120] or None,
        "channels": [str(c).strip()[:80] for c in data.channels[:8] if str(c).strip()],
        "notes": (data.notes or "").strip()[:3000] or None,
        "source": (data.source or "website").strip()[:120],
        "attribution": {
            key: (str(data.attribution.get(key))[:1000] if data.attribution.get(key) is not None else None)
            for key in (
                "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
                "fbclid", "fbc", "fbp", "landing_page", "referrer",
            )
        },
        "consent_at": datetime.now(timezone.utc).isoformat(),
    }
    result = get_supabase().table("demo_requests").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="No se pudo guardar la solicitud")
    logger.info("Nueva solicitud de demo id=%s source=%s", result.data[0]["id"], row["source"])
    return {"ok": True, "request_id": result.data[0]["id"]}


@router.post("/clinicas/registro")
async def registrar_clinica(data: RegistroClinicaRequest):
    """
    Crea una clínica nueva y vincula al usuario.
    Llamado desde el onboarding self-service vía proxy autenticado.
    El dashboard valida la sesión antes de llamar aquí.
    """
    db = get_supabase()

    # Un usuario no puede tener más de una clínica
    ya_existe = (
        db.table("clinica_usuarios")
        .select("clinic_id")
        .eq("user_id", data.user_id)
        .limit(1)
        .execute()
    )
    if ya_existe.data:
        clinic_id = ya_existe.data[0]["clinic_id"]
        clinica = db.table("clinicas").select("id, nombre, trial_expires_at, plan").eq("id", clinic_id).single().execute()
        return {"clinic_id": clinic_id, "ya_existia": True, **clinica.data}

    # Crear la clínica
    trial_expires_at = (datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)).isoformat()

    clinica_data = {
        "nombre": data.nombre,
        "trial_expires_at": trial_expires_at,
        "plan": "trial",
        "onboarding_step": 1,
        "onboarding_ok": False,
    }
    if data.especialidad:
        clinica_data["especialidad"] = data.especialidad
    if data.url_web:
        clinica_data["url_web"] = data.url_web
    if data.telefono:
        clinica_data["telefono"] = data.telefono
    if data.email:
        clinica_data["email_contacto"] = data.email

    nueva = db.table("clinicas").insert(clinica_data).execute()
    if not nueva.data:
        raise HTTPException(status_code=500, detail="Error al crear la clínica")

    clinic_id = nueva.data[0]["id"]

    # Vincular usuario a la clínica
    db.table("clinica_usuarios").insert({
        "user_id": data.user_id,
        "clinic_id": clinic_id,
    }).execute()

    logger.info("Clínica '%s' creada (id=%s) para usuario %s", data.nombre, clinic_id, data.user_id)

    # El alta NO crea ningún agente en Retell: todas las clínicas comparten el
    # agente único de la plataforma (RETELL_AGENT_ID). La voz se activa después,
    # desde el panel, asignando un número y configurando el desvío.
    return {
        "clinic_id": clinic_id,
        "trial_expires_at": trial_expires_at,
        "ya_existia": False,
    }
