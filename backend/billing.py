"""
Helpers de billing: verificación de plan activo y límites de minutos.
"""
import asyncio
import logging
import math
from datetime import datetime, timezone

from database.client import get_supabase

logger = logging.getLogger(__name__)

MINUTOS_POR_PLAN = {
    "trial": 100,
    "starter": 300,
    "pro": 750,
    "growth": 1800,
}


class PlanInactivo(Exception):
    """Plan expirado o cancelado."""
    def __init__(self, motivo: str):
        self.motivo = motivo
        super().__init__(motivo)


class MinutosAgotados(Exception):
    """Minutos del mes agotados."""
    def __init__(self, usados: int, incluidos: int):
        self.usados = usados
        self.incluidos = incluidos
        super().__init__(f"Minutos agotados: {usados}/{incluidos}")


def _check_plan_active_sync(clinic_id: str) -> dict:
    db = get_supabase()
    row = db.table("clinicas").select(
        "plan, trial_expires_at, minutos_usados_mes, minutos_incluidos, stripe_subscription_status"
    ).eq("id", clinic_id).single().execute()

    clinica = row.data
    plan = clinica.get("plan", "trial")
    ahora = datetime.now(timezone.utc)

    if plan == "cancelado":
        raise PlanInactivo("plan_cancelado")

    if plan == "trial":
        expires_raw = clinica.get("trial_expires_at")
        if expires_raw:
            expires = datetime.fromisoformat(expires_raw.replace("Z", "+00:00"))
            if expires < ahora:
                raise PlanInactivo("trial_expirado")

    if plan not in ("trial", "cancelado"):
        sub_status = clinica.get("stripe_subscription_status")
        if sub_status and sub_status not in ("active", "trialing"):
            raise PlanInactivo(f"suscripcion_{sub_status}")

    usados = clinica.get("minutos_usados_mes") or 0
    incluidos = clinica.get("minutos_incluidos") or MINUTOS_POR_PLAN.get(plan, 100)
    if usados >= incluidos:
        raise MinutosAgotados(usados, incluidos)

    return clinica


async def check_plan_active(clinic_id: str) -> dict:
    """
    Verifica que la clínica puede usar el servicio (async — no bloquea el event loop).
    Lanza PlanInactivo o MinutosAgotados si no puede.
    """
    return await asyncio.to_thread(_check_plan_active_sync, clinic_id)


def reset_periodo_facturacion(clinic_id: str) -> None:
    """Pone a cero el contador de minutos y abre un nuevo período de facturación."""
    db = get_supabase()
    db.table("clinicas").update({
        "minutos_usados_mes": 0,
        "billing_period_start": datetime.now(timezone.utc).isoformat(),
    }).eq("id", clinic_id).execute()
    logger.info("Período de facturación reiniciado para clínica %s", clinic_id)


def minutos_de_llamada(duracion_ms: int | float | None) -> int:
    """
    Convierte la duración de una llamada Retell a minutos facturables.
    Redondeo hacia arriba con mínimo 1 minuto (igual que factura la telefonía).
    Devuelve 0 si no hay duración válida.
    """
    try:
        ms = float(duracion_ms or 0)
    except (TypeError, ValueError):
        return 0
    if ms <= 0:
        return 0
    return max(1, math.ceil(ms / 60000))


async def incrementar_minutos(clinic_id: str, minutos: int = 1) -> None:
    """Incrementa minutos usados del mes de forma atómica; el caller decide el reintento."""
    try:
        db = get_supabase()
        # UPDATE atómico via RPC — evita race condition entre llamadas simultáneas
        await asyncio.to_thread(
            lambda: db.rpc(
                "increment_minutos_mes",
                {"p_clinic_id": clinic_id, "p_delta": minutos},
            ).execute()
        )
    except Exception as exc:
        logger.warning("incrementar_minutos failed for %s: %s", clinic_id, exc)
        raise
