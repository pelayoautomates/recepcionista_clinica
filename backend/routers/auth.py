import logging
import base64
import hashlib
import hmac
import json
import secrets
import time
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from config import settings
from google_calendar.auth import get_authorization_url_with_state, save_tokens

logger = logging.getLogger(__name__)
router = APIRouter()
_OAUTH_NONCE_COOKIE = "gcal_oauth_nonce"
_STATE_TTL_SECONDS = 10 * 60

_SUCCESS_HTML = """
<html>
<head><meta charset="utf-8"><title>Google Calendar conectado</title></head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:60px 20px;background:#f9fafb;">
  <div style="max-width:420px;margin:auto;background:white;border-radius:16px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="font-size:48px;margin-bottom:16px;">✅</div>
    <h2 style="margin:0 0 10px;color:#111827;font-size:20px;">Google Calendar conectado</h2>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">El sistema sincronizará las citas automáticamente.</p>
    <a href="{dashboard_url}/panel/configuracion" style="display:inline-block;padding:11px 24px;background:#111827;color:white;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
      Volver al panel →
    </a>
  </div>
</body>
</html>
"""

def _error_html(title: str, detail: str, redirect_uri: str = "") -> str:
    hint = ""
    if redirect_uri:
        hint = f"<p style='font-size:12px;color:#9ca3af;margin-top:16px;word-break:break-all;'>URI configurada: <code>{redirect_uri}</code></p>"
    return f"""
<html>
<head><meta charset="utf-8"><title>Error Google Calendar</title></head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:60px 20px;background:#f9fafb;">
  <div style="max-width:480px;margin:auto;background:white;border-radius:16px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="font-size:48px;margin-bottom:16px;">❌</div>
    <h2 style="margin:0 0 10px;color:#111827;font-size:20px;">{title}</h2>
    <p style="color:#6b7280;margin:0;font-size:14px;">{detail}</p>
    {hint}
    <p style="font-size:13px;color:#9ca3af;margin-top:20px;">Puedes cerrar esta ventana e intentarlo de nuevo desde el panel.</p>
  </div>
</body>
</html>
"""


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _sign_state(payload_bytes: bytes) -> str:
    secret = settings.fernet_key.encode("utf-8")
    return hmac.new(secret, payload_bytes, hashlib.sha256).hexdigest()


def _build_oauth_state(clinic_id: str, nonce: str) -> str:
    payload = {
        "clinic_id": clinic_id,
        "nonce": nonce,
        "ts": int(time.time()),
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    signature = _sign_state(payload_bytes).encode("utf-8")
    return f"{_b64url_encode(payload_bytes)}.{_b64url_encode(signature)}"


def _parse_oauth_state(state_token: str, expected_nonce: str | None) -> dict:
    try:
        encoded_payload, encoded_sig = state_token.split(".", 1)
        payload_bytes = _b64url_decode(encoded_payload)
        sig = _b64url_decode(encoded_sig).decode("utf-8")
    except Exception as exc:
        raise ValueError("state_malformed") from exc

    expected_sig = _sign_state(payload_bytes)
    if not hmac.compare_digest(sig, expected_sig):
        raise ValueError("state_signature_invalid")

    try:
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception as exc:
        raise ValueError("state_payload_invalid") from exc

    ts = int(payload.get("ts", 0))
    if ts <= 0 or (int(time.time()) - ts) > _STATE_TTL_SECONDS:
        raise ValueError("state_expired")

    nonce = str(payload.get("nonce") or "")
    if not nonce or not expected_nonce or nonce != expected_nonce:
        raise ValueError("state_nonce_invalid")

    clinic_id = str(payload.get("clinic_id") or "")
    if not clinic_id:
        raise ValueError("state_clinic_missing")

    return payload


def _parse_start_access(access_token: str, clinic_id: str) -> None:
    """Autoriza el inicio OAuth emitido por el BFF autenticado del dashboard."""
    if not settings.admin_api_key:
        if settings.is_production:
            raise HTTPException(status_code=503, detail="OAuth start no configurado")
        return
    try:
        encoded_payload, signature = access_token.split(".", 1)
        payload_bytes = _b64url_decode(encoded_payload)
        expected = hmac.new(
            settings.admin_api_key.encode("utf-8"), payload_bytes, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("signature")
        payload = json.loads(payload_bytes.decode("utf-8"))
        if str(payload.get("clinic_id")) != clinic_id:
            raise ValueError("clinic")
        expires_at = int(payload.get("exp", 0))
        if expires_at < int(time.time()) or expires_at > int(time.time()) + 10 * 60:
            raise ValueError("expiry")
    except Exception as exc:
        raise HTTPException(status_code=403, detail="Inicio OAuth no autorizado") from exc


@router.get("/google/callback")
async def google_auth_callback(request: Request):
    """Callback OAuth2 de Google. Acepta tanto code+state como error."""
    params = dict(request.query_params)

    # Google devuelve error si el usuario deniega
    if "error" in params:
        err = params.get("error", "access_denied")
        logger.warning("OAuth Google denegado: %s", err)
        return HTMLResponse(status_code=200, content=_error_html(
            "Acceso denegado",
            "No se completó la autorización con Google. Vuelve al panel e inténtalo de nuevo.",
        ))

    code = params.get("code")
    state = params.get("state")
    if not code or not state:
        return HTMLResponse(status_code=400, content=_error_html(
            "Parámetros incorrectos",
            "El callback no incluye 'code' o 'state'. Verifica que la URI de redirección esté configurada correctamente.",
            settings.google_redirect_uri,
        ))

    state_nonce_cookie = request.cookies.get(_OAUTH_NONCE_COOKIE)
    try:
        state_payload = _parse_oauth_state(state, state_nonce_cookie)
        clinic_id = UUID(state_payload["clinic_id"])
    except ValueError:
        return HTMLResponse(status_code=400, content=_error_html(
            "State inválido",
            "El estado OAuth no es válido o ha expirado. Inicia de nuevo la conexión desde el panel.",
        ))

    try:
        save_tokens(clinic_id, code, state)
        dashboard_url = settings.allowed_origins.split(",")[0].strip().rstrip("/")
        response = HTMLResponse(content=_SUCCESS_HTML.format(dashboard_url=dashboard_url))
        response.delete_cookie(_OAUTH_NONCE_COOKIE)
        return response
    except Exception as e:
        logger.error("Error guardando tokens OAuth Google clinic=%s: %s", clinic_id, e, exc_info=True)
        return HTMLResponse(status_code=500, content=_error_html(
            "Error al guardar tokens",
            f"Detalle técnico: {str(e)[:200]}. Asegúrate de que GOOGLE_REDIRECT_URI en Railway coincide exactamente con la URI autorizada en Google Cloud Console.",
            settings.google_redirect_uri,
        ))


@router.get("/google/{clinic_id}")
async def google_auth_start(clinic_id: UUID, access: str = ""):
    """Inicia el flujo OAuth2 con Google Calendar para una clínica."""
    _parse_start_access(access, str(clinic_id))
    try:
        nonce = secrets.token_urlsafe(24)
        state_token = _build_oauth_state(str(clinic_id), nonce)
        auth_url = get_authorization_url_with_state(state_token)
        response = RedirectResponse(url=auth_url)
        response.set_cookie(
            key=_OAUTH_NONCE_COOKIE,
            value=nonce,
            max_age=_STATE_TTL_SECONDS,
            httponly=True,
            secure=settings.is_production,
            samesite="lax",
        )
        return response
    except Exception as e:
        logger.error("Error iniciando OAuth Google: %s", e)
        raise HTTPException(status_code=500, detail=f"Error iniciando autenticación con Google: {e}")


@router.get("/google/debug/config")
async def google_debug_config(x_admin_key: str = Header(default="")):
    """Muestra la configuración OAuth actual (solo para admins)."""
    if x_admin_key != settings.admin_api_key or not settings.admin_api_key:
        raise HTTPException(status_code=403, detail="Forbidden")
    return {
        "google_redirect_uri": settings.google_redirect_uri,
        "google_client_id_configured": bool(settings.google_client_id),
        "google_client_secret_configured": bool(settings.google_client_secret),
        "fernet_key_configured": bool(settings.fernet_key),
        "instructions": {
            "step1": f"En Google Cloud Console → Credentials → OAuth 2.0 → Authorized redirect URIs, añade exactamente: {settings.google_redirect_uri}",
            "step2": "En Railway, GOOGLE_REDIRECT_URI debe ser: https://<tu-backend>/auth/google/callback",
        },
    }
