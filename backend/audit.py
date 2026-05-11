"""
Audit log helper.
Registra toda acción importante: creación/modificación/cancelación de citas,
cambios de lead, escalados a humano, etc.

Uso:
    await audit(
        clinic_id="uuid",
        actor="ia",            # 'ia' | 'humano:user_id' | 'sistema'
        accion="cita.crear",   # entidad.verbo
        entidad="citas",
        entidad_id="uuid",
        datos_despues={...},
        canal="voz",
    )
"""
import logging
from typing import Any

from database.client import get_supabase

logger = logging.getLogger(__name__)

# Acciones estándar
CITA_CREAR = "cita.crear"
CITA_MOVER = "cita.mover"
CITA_CANCELAR = "cita.cancelar"
CITA_COMPLETAR = "cita.completar"
CITA_NO_SHOW = "cita.no_show"
LEAD_CREAR = "lead.crear"
LEAD_ACTUALIZAR = "lead.actualizar"
LEAD_ESCALAR = "lead.escalar"
CONV_RESOLVER = "conversacion.resolver"
CONFIG_GUARDAR = "config.guardar"


async def audit(
    clinic_id: str,
    actor: str,
    accion: str,
    entidad: str,
    entidad_id: str | None = None,
    datos_antes: dict[str, Any] | None = None,
    datos_despues: dict[str, Any] | None = None,
    canal: str | None = None,
    notas: str | None = None,
    ip: str | None = None,
) -> None:
    """Inserta un registro de auditoría. Fallo silencioso para no romper flujo principal."""
    try:
        db = get_supabase()
        row: dict[str, Any] = {
            "clinic_id": clinic_id,
            "actor": actor,
            "accion": accion,
            "entidad": entidad,
        }
        if entidad_id:
            row["entidad_id"] = entidad_id
        if datos_antes:
            row["datos_antes"] = datos_antes
        if datos_despues:
            row["datos_despues"] = datos_despues
        if canal:
            row["canal"] = canal
        if notas:
            row["notas"] = notas
        if ip:
            row["ip"] = ip
        db.table("audit_logs").insert(row).execute()
    except Exception as exc:
        logger.warning("audit log failed: %s", exc)
