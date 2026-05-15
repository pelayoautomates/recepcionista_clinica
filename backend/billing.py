"""
Helpers de billing: verificación de plan activo y límites de minutos.
"""
import asyncio
import logging
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
        if sub_status and sub_status not in ("active", "trialing", "past_due"):
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


async def incrementar_minutos(clinic_id: str, minutos: int = 1) -> None:
    """Incrementa minutos usados del mes de forma atómica. Fallo silencioso."""
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
