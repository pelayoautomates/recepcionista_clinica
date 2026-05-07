import logging
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from postgrest.exceptions import APIError

from database.client import get_supabase

INVITE_TTL_HOURS = 72

logger = logging.getLogger(__name__)
router = APIRouter()


def _is_missing_expires_at_error(exc: Exception) -> bool:
    if not isinstance(exc, APIError):
        return False
    message = str(exc)
    return "invitaciones.expires_at" in message and "does not exist" in message


def _obtener_token_activo(db, clinic_id: UUID):
    """Compatibilidad: funciona con y sin columna expires_at."""
    def _build_query():
        return db.table("invitaciones")\
            .select("token")\
            .eq("clinic_id", str(clinic_id))\
            .eq("usado", False)\
            .limit(1)

    try:
        return _build_query().is_("expires_at", "null").execute()
    except Exception as exc:
        if _is_missing_expires_at_error(exc):
            return _build_query().execute()
        raise


class VincularRequest(BaseModel):
    token: str
    user_id: str
    email: str


@router.get("/clinicas/{clinic_id}/invitacion")
async def obtener_invitacion(clinic_id: UUID):
    """Devuelve el token permanente existente para la clínica, si hay uno."""
    db = get_supabase()
    existing = _obtener_token_activo(db, clinic_id)
    if existing.data:
        return {"token": existing.data[0]["token"], "permanente": True}
    return {"token": None}


@router.delete("/clinicas/{clinic_id}/invitacion")
async def regenerar_invitacion(clinic_id: UUID):
    """Invalida el token permanente actual y genera uno nuevo."""
    db = get_supabase()
    def _build_query():
        return db.table("invitaciones")\
            .update({"usado": True})\
            .eq("clinic_id", str(clinic_id))

    try:
        _build_query().is_("expires_at", "null").execute()
    except Exception as exc:
        if _is_missing_expires_at_error(exc):
            _build_query().execute()
        else:
            raise
    # El próximo POST creará uno nuevo
    return {"ok": True}


@router.post("/clinicas/{clinic_id}/invitacion")
async def crear_invitacion(clinic_id: UUID):
    """Genera un link de invitación para que una clínica acceda a su panel."""
    db = get_supabase()

    # Verificar que la clínica existe
    result = db.table("clinicas").select("id").eq("id", str(clinic_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")

    # Reutilizar token permanente si ya existe (expires_at = null)
    existing = _obtener_token_activo(db, clinic_id)

    if existing.data:
        return {"token": existing.data[0]["token"], "permanente": True}

    # Crear token permanente nuevo (sin expires_at)
    token = secrets.token_urlsafe(32)
    db.table("invitaciones").insert({
        "clinic_id": str(clinic_id),
        "token": token,
        # expires_at omitido → permanente
    }).execute()

    return {"token": token, "permanente": True}


@router.post("/invitaciones/vincular")
async def vincular_usuario(data: VincularRequest):
    """
    Llamado tras el login con Google del cliente.
    Vincula el user_id de Supabase con la clínica del token.
    """
    db = get_supabase()

    inv = db.table("invitaciones")\
        .select("*")\
        .eq("token", data.token)\
        .eq("usado", False)\
        .single()\
        .execute()

    if not inv.data:
        raise HTTPException(status_code=404, detail="Invitación no válida o ya usada")

    inv_data = inv.data
    es_permanente = inv_data.get("expires_at") is None

    if not es_permanente:
        expires_at = inv_data.get("expires_at")
        if expires_at:
            exp = datetime.fromisoformat(expires_at)
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > exp:
                raise HTTPException(status_code=410, detail="Invitación expirada. Solicita un nuevo enlace.")

    clinic_id = inv_data["clinic_id"]

    # Vincular usuario a clínica
    db.table("clinica_usuarios").upsert({
        "user_id": data.user_id,
        "clinic_id": clinic_id,
    }, on_conflict="user_id,clinic_id").execute()

    # Solo marcar como usada si NO es permanente
    if not es_permanente:
        db.table("invitaciones").update({"usado": True}).eq("id", inv_data["id"]).execute()

    logger.info("Usuario %s vinculado a clínica %s", data.user_id, clinic_id)
    return {"clinic_id": clinic_id}


@router.get("/me/rol")
async def obtener_rol(user_id: str, email: str):
    """
    Devuelve el rol del usuario: 'agencia' | 'clinica' | None
    El dashboard lo llama justo después del login.
    """
    db = get_supabase()

    # ¿Es admin de agencia?
    admin = db.table("agencia_admins")\
        .select("user_id")\
        .eq("user_id", user_id)\
        .execute()
    if admin.data:
        return {"rol": "agencia"}

    # ¿Está vinculado a una clínica?
    clinica_user = db.table("clinica_usuarios")\
        .select("clinic_id")\
        .eq("user_id", user_id)\
        .limit(1)\
        .execute()
    if clinica_user.data:
        return {"rol": "clinica", "clinic_id": clinica_user.data[0]["clinic_id"]}

    return {"rol": None}
