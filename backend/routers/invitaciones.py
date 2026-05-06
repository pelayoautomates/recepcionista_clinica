import logging
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database.client import get_supabase

INVITE_TTL_HOURS = 72

logger = logging.getLogger(__name__)
router = APIRouter()


class VincularRequest(BaseModel):
    token: str
    user_id: str
    email: str


@router.post("/clinicas/{clinic_id}/invitacion")
async def crear_invitacion(clinic_id: UUID):
    """Genera un link de invitación para que una clínica acceda a su panel."""
    db = get_supabase()

    # Verificar que la clínica existe
    result = db.table("clinicas").select("id").eq("id", str(clinic_id)).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")

    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=INVITE_TTL_HOURS)).isoformat()
    db.table("invitaciones").insert({
        "clinic_id": str(clinic_id),
        "token": token,
        "expires_at": expires_at,
    }).execute()

    return {"token": token, "expires_at": expires_at}


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

    expires_at = inv.data.get("expires_at")
    if expires_at:
        exp = datetime.fromisoformat(expires_at)
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > exp:
            raise HTTPException(status_code=410, detail="Invitación expirada. Solicita un nuevo enlace.")

    clinic_id = inv.data["clinic_id"]

    # Vincular usuario a clínica
    db.table("clinica_usuarios").upsert({
        "user_id": data.user_id,
        "clinic_id": clinic_id,
    }, on_conflict="user_id,clinic_id").execute()

    # Marcar invitación como usada
    db.table("invitaciones").update({"usado": True}).eq("id", inv.data["id"]).execute()

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
