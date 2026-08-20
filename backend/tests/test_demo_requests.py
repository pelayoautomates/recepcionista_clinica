from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def app():
    from main import app
    return app


@pytest.mark.asyncio
async def test_demo_request_is_persisted(app):
    db = MagicMock()
    db.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "11111111-1111-1111-1111-111111111111"}
    ]
    payload = {
        "clinic_name": "Clinica Luna",
        "email": "DIRECCION@EXAMPLE.COM",
        "specialty": "Clinica estetica",
        "channels": ["Telefono IA"],
        "source": "google",
        "privacy_accepted": True,
    }

    with patch("routers.registro.get_supabase", return_value=db):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/saas/demo-requests",
                json=payload,
                headers={"x-admin-key": "test-admin-key"},
            )

    assert response.status_code == 201
    inserted = db.table.return_value.insert.call_args.args[0]
    assert inserted["email"] == "direccion@example.com"
    assert inserted["consent_at"]


@pytest.mark.asyncio
async def test_demo_request_rejects_invalid_email(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/saas/demo-requests",
            json={"clinic_name": "Clinica Luna", "email": "not-an-email", "privacy_accepted": True},
            headers={"x-admin-key": "test-admin-key"},
        )

    assert response.status_code == 400
