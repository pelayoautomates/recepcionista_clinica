"""Unit tests for billing logic."""
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone, timedelta


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
    from billing import check_plan_active, PlanInactivo, MinutosAgotados
    expires = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    db = _mock_supabase(plan="trial", trial_expires_at=expires)
    with patch("billing.get_supabase", return_value=db):
        result = check_plan_active("clinic-1")
    assert result["plan"] == "trial"


def test_trial_expirado_bloquea():
    from billing import check_plan_active, PlanInactivo
    expires = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    db = _mock_supabase(plan="trial", trial_expires_at=expires)
    with patch("billing.get_supabase", return_value=db):
        with pytest.raises(PlanInactivo) as exc:
            check_plan_active("clinic-1")
    assert "trial_expirado" in str(exc.value)


def test_plan_sin_expires_pasa():
    """Trial sin trial_expires_at = trial indefinido (dev/test)."""
    from billing import check_plan_active
    db = _mock_supabase(plan="trial", trial_expires_at=None)
    with patch("billing.get_supabase", return_value=db):
        result = check_plan_active("clinic-1")
    assert result is not None


def test_plan_cancelado_bloquea():
    from billing import check_plan_active, PlanInactivo
    db = _mock_supabase(plan="cancelado")
    with patch("billing.get_supabase", return_value=db):
        with pytest.raises(PlanInactivo):
            check_plan_active("clinic-1")


def test_minutos_agotados_bloquea():
    from billing import check_plan_active, MinutosAgotados
    db = _mock_supabase(plan="trial", minutos_usados=300, minutos_incluidos=300)
    with patch("billing.get_supabase", return_value=db):
        with pytest.raises(MinutosAgotados) as exc:
            check_plan_active("clinic-1")
    assert exc.value.usados == 300


def test_starter_activo_pasa():
    from billing import check_plan_active
    db = _mock_supabase(plan="starter", sub_status="active", minutos_usados=100, minutos_incluidos=300)
    with patch("billing.get_supabase", return_value=db):
        result = check_plan_active("clinic-1")
    assert result is not None


def test_starter_sub_inactiva_bloquea():
    from billing import check_plan_active, PlanInactivo
    db = _mock_supabase(plan="starter", sub_status="canceled")
    with patch("billing.get_supabase", return_value=db):
        with pytest.raises(PlanInactivo):
            check_plan_active("clinic-1")
