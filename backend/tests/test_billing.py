"""Unit tests for billing logic."""
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone, timedelta

# check_plan_active es async (corre la consulta en un thread). La lógica pura vive
# en _check_plan_active_sync, que es lo que se testea aquí sin event loop.
from billing import _check_plan_active_sync as check_plan_active


def _mock_supabase(plan="trial", trial_expires_at=None, minutos_usados=0, minutos_incluidos=300, sub_status=None):
    db = MagicMock()
    db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "plan": plan,
        "trial_expires_at": trial_expires_at,
        "minutos_usados_mes": minutos_usados,
        "minutos_incluidos": minutos_incluidos,
        "stripe_subscription_status": sub_status,
    }
    return db


def test_trial_activo_pasa():
    expires = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    db = _mock_supabase(plan="trial", trial_expires_at=expires)
    with patch("billing.get_supabase", return_value=db):
        result = check_plan_active("clinic-1")
    assert result["plan"] == "trial"


def test_trial_expirado_bloquea():
    from billing import PlanInactivo
    expires = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    db = _mock_supabase(plan="trial", trial_expires_at=expires)
    with patch("billing.get_supabase", return_value=db):
        with pytest.raises(PlanInactivo) as exc:
            check_plan_active("clinic-1")
    assert "trial_expirado" in str(exc.value)


def test_plan_sin_expires_pasa():
    """Trial sin trial_expires_at = trial indefinido (dev/test)."""
    db = _mock_supabase(plan="trial", trial_expires_at=None)
    with patch("billing.get_supabase", return_value=db):
        result = check_plan_active("clinic-1")
    assert result is not None


def test_plan_cancelado_bloquea():
    from billing import PlanInactivo
    db = _mock_supabase(plan="cancelado")
    with patch("billing.get_supabase", return_value=db):
        with pytest.raises(PlanInactivo):
            check_plan_active("clinic-1")


def test_minutos_agotados_bloquea():
    from billing import MinutosAgotados
    db = _mock_supabase(plan="trial", minutos_usados=300, minutos_incluidos=300)
    with patch("billing.get_supabase", return_value=db):
        with pytest.raises(MinutosAgotados) as exc:
            check_plan_active("clinic-1")
    assert exc.value.usados == 300


def test_starter_activo_pasa():
    db = _mock_supabase(plan="starter", sub_status="active", minutos_usados=100, minutos_incluidos=300)
    with patch("billing.get_supabase", return_value=db):
        result = check_plan_active("clinic-1")
    assert result is not None


def test_starter_sub_inactiva_bloquea():
    from billing import PlanInactivo
    db = _mock_supabase(plan="starter", sub_status="canceled")
    with patch("billing.get_supabase", return_value=db):
        with pytest.raises(PlanInactivo):
            check_plan_active("clinic-1")


@pytest.mark.asyncio
async def test_check_plan_active_async_wrapper():
    """El wrapper async devuelve lo mismo que la función sync."""
    from billing import check_plan_active as check_async
    db = _mock_supabase(plan="pro", sub_status="active", minutos_incluidos=750)
    with patch("billing.get_supabase", return_value=db):
        result = await check_async("clinic-1")
    assert result["plan"] == "pro"


# ── Conversión de duración de llamada a minutos facturables ──────────────────

@pytest.mark.parametrize("ms,esperado", [
    (None, 0),
    (0, 0),
    (-500, 0),
    (1_000, 1),        # 1 segundo → mínimo 1 minuto
    (60_000, 1),       # exactamente 1 minuto
    (60_001, 2),       # 1 min y 1 ms → se redondea hacia arriba
    (185_000, 4),      # 3 min 5 s → 4
    ("abc", 0),        # basura → 0, nunca cobrar de más
])
def test_minutos_de_llamada(ms, esperado):
    from billing import minutos_de_llamada
    assert minutos_de_llamada(ms) == esperado
