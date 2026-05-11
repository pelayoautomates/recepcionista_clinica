import logging
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from config import settings
from google_calendar.auth import get_authorization_url, save_tokens

logger = logging.getLogger(__name__)
router = APIRouter()

_SUCCESS_HTML = """
<html>
<head><meta charset="utf-8"><title>Google Calendar conectado</title></head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:60px 20px;background:#f9fafb;">
  <div style="max-width:420px;margin:auto;background:white;border-radius:16px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="font-size:48px;margin-bottom:16px;">✅</div>
    <h2 style="margin:0 0 10px;color:#111827;font-size:20px;">Google Calendar conectado</h2>
    <p style="color:#6b7280;margin:0;font-size:14px;">Ya puedes cerrar esta ventana. El sistema sincronizará las citas automáticamente.</p>
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

    try:
        clinic_id = UUID(state)
    except ValueError:
        return HTMLResponse(status_code=400, content=_error_html(
            "State inválido",
            f"El parámetro state no es un UUID válido: {state[:80]}",
        ))

    try:
        save_tokens(clinic_id, code, state)
        return HTMLResponse(content=_SUCCESS_HTML)
    except Exception as e:
        logger.error("Error guardando tokens OAuth Google clinic=%s: %s", clinic_id, e, exc_info=True)
        return HTMLResponse(status_code=500, content=_error_html(
            "Error al guardar tokens",
            f"Detalle técnico: {str(e)[:200]}. Asegúrate de que GOOGLE_REDIRECT_URI en Railway coincide exactamente con la URI autorizada en Google Cloud Console.",
            settings.google_redirect_uri,
        ))


@router.get("/google/{clinic_id}")
async def google_auth_start(clinic_id: UUID):
    """Inicia el flujo OAuth2 con Google Calendar para una clínica."""
    try:
        auth_url = get_authorization_url(clinic_id)
        return RedirectResponse(url=auth_url)
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
