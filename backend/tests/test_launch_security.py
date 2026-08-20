from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_dispatch_scopes_appointment_mutations_to_clinic():
    from agent.core import _dispatch_tool

    with patch("tools.calendario.mover_cita", new=AsyncMock(return_value={"ok": True})) as mover:
        await _dispatch_tool(
            "mover_cita",
            {"cita_id": "appointment-1", "nueva_fecha_inicio_iso": "2026-09-01T10:00:00+02:00"},
            "clinic-1",
        )
    mover.assert_awaited_once_with(
        "clinic-1",
        cita_id="appointment-1",
        nueva_fecha_inicio_iso="2026-09-01T10:00:00+02:00",
    )

    with patch("tools.calendario.cancelar_cita", new=AsyncMock(return_value={"ok": True})) as cancelar:
        await _dispatch_tool("cancelar_cita", {"cita_id": "appointment-1"}, "clinic-1")
    cancelar.assert_awaited_once_with("clinic-1", cita_id="appointment-1")


def test_past_due_subscription_is_blocked():
    from billing import PlanInactivo, _check_plan_active_sync

    db = MagicMock()
    db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "plan": "starter",
        "trial_expires_at": None,
        "minutos_usados_mes": 0,
        "minutos_incluidos": 300,
        "stripe_subscription_status": "past_due",
    }
    with patch("billing.get_supabase", return_value=db), pytest.raises(PlanInactivo):
        _check_plan_active_sync("clinic-1")


def test_outbound_rejects_private_destinations(monkeypatch):
    from outbound import validate_public_http_url

    monkeypatch.setattr(
        "outbound.socket.getaddrinfo",
        lambda *args, **kwargs: [(None, None, None, None, ("127.0.0.1", 443))],
    )
    with pytest.raises(ValueError):
        validate_public_http_url("https://internal.example/hook", https_only=True)
