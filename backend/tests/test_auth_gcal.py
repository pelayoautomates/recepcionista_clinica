"""Tests for Google Calendar OAuth router."""
import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


@pytest.fixture
def app():
    from main import app
    return app


@pytest.mark.asyncio
async def test_gcal_callback_missing_params(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/auth/google/callback")
    assert res.status_code == 400
    assert "code" in res.text.lower() or "param" in res.text.lower()


@pytest.mark.asyncio
async def test_gcal_callback_user_denied(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/auth/google/callback?error=access_denied")
    assert res.status_code == 200
    assert "denegado" in res.text.lower() or "denied" in res.text.lower()


@pytest.mark.asyncio
async def test_gcal_callback_invalid_state(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/auth/google/callback?code=abc&state=not-a-uuid")
    assert res.status_code == 400
    assert "state" in res.text.lower()


@pytest.mark.asyncio
async def test_gcal_callback_token_error(app):
    """Simulates save_tokens raising an exception (e.g. wrong redirect_uri)."""
    with patch("routers.auth.save_tokens", side_effect=Exception("redirect_uri_mismatch")):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get(
                "/auth/google/callback?code=valid_code&state=11111111-1111-1111-1111-111111111111"
            )
    assert res.status_code == 500
    assert "redirect" in res.text.lower() or "uri" in res.text.lower() or "token" in res.text.lower()


@pytest.mark.asyncio
async def test_gcal_callback_success(app):
    with patch("routers.auth.save_tokens"):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get(
                "/auth/google/callback?code=valid_code&state=11111111-1111-1111-1111-111111111111"
            )
    assert res.status_code == 200
    assert "conectado" in res.text.lower() or "calendar" in res.text.lower()


@pytest.mark.asyncio
async def test_gcal_debug_requires_admin_key(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/auth/google/debug/config")
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_gcal_debug_with_admin_key(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/auth/google/debug/config", headers={"x-admin-key": "test-admin-key"})
    assert res.status_code == 200
    data = res.json()
    assert "google_redirect_uri" in data
    assert "instructions" in data
