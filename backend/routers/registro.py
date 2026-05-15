import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

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
    return {
        "clinic_id": clinic_id,
        "trial_expires_at": trial_expires_at,
        "ya_existia": False,
    }
