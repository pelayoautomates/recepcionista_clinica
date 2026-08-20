"""Tests for Google Calendar OAuth router."""
import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport
import sys, os
import hashlib
import hmac
import json
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


CLINIC_ID = "11111111-1111-1111-1111-111111111111"


@pytest.fixture
def app():
    from main import app
    return app


@pytest.fixture
def signed_state():
    """
    El callback exige un state firmado (HMAC) + la cookie de nonce que se emitió
    al iniciar el flujo. Aquí se reproduce ese par para poder testear el callback.
    """
    from routers.auth import _build_oauth_state, _OAUTH_NONCE_COOKIE
    nonce = "nonce-de-prueba"
    return {
        "state": _build_oauth_state(CLINIC_ID, nonce),
        "cookies": {_OAUTH_NONCE_COOKIE: nonce},
    }


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
async def test_gcal_callback_token_error(app, signed_state):
    """Simulates save_tokens raising an exception (e.g. wrong redirect_uri)."""
    with patch("routers.auth.save_tokens", side_effect=Exception("redirect_uri_mismatch")):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", cookies=signed_state["cookies"]
        ) as client:
            res = await client.get(
                f"/auth/google/callback?code=valid_code&state={signed_state['state']}"
            )
    assert res.status_code == 500
    assert "redirect" in res.text.lower() or "uri" in res.text.lower() or "token" in res.text.lower()


@pytest.mark.asyncio
async def test_gcal_callback_success(app, signed_state):
    with patch("routers.auth.save_tokens"):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test", cookies=signed_state["cookies"]
        ) as client:
            res = await client.get(
                f"/auth/google/callback?code=valid_code&state={signed_state['state']}"
            )
    assert res.status_code == 200
    assert "conectado" in res.text.lower() or "calendar" in res.text.lower()


@pytest.mark.asyncio
async def test_gcal_callback_state_sin_cookie_nonce(app, signed_state):
    """Un state válido robado no sirve sin la cookie de nonce del navegador."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(
            f"/auth/google/callback?code=valid_code&state={signed_state['state']}"
        )
    assert res.status_code == 400
    assert "state" in res.text.lower()


@pytest.mark.asyncio
async def test_gcal_start_rejects_direct_unauthorized_access(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(f"/auth/google/{CLINIC_ID}")
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_gcal_start_accepts_short_lived_bff_token(app):
    from routers.auth import _b64url_encode
    payload = json.dumps({
        "clinic_id": CLINIC_ID,
        "user_id": "user-1",
        "exp": int(time.time()) + 300,
    }, separators=(",", ":")).encode()
    encoded = _b64url_encode(payload)
    signature = hmac.new(b"test-admin-key", payload, hashlib.sha256).hexdigest()

    with patch("routers.auth.get_authorization_url_with_state", return_value="https://accounts.google.com/o/oauth2/auth"):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get(
                f"/auth/google/{CLINIC_ID}?access={encoded}.{signature}",
                follow_redirects=False,
            )
    assert res.status_code == 307


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
