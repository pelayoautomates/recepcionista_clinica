import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse

from google_calendar.auth import get_authorization_url, save_tokens

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/google/callback")
async def google_auth_callback(code: str, state: str):
    """
    Callback OAuth2 de Google. Guarda los tokens cifrados en Supabase.
    El 'state' contiene el clinic_id.
    """
    try:
        clinic_id = UUID(state)
        save_tokens(clinic_id, code, state)
        return HTMLResponse(content="""
        <html>
            <body style="font-family: sans-serif; text-align: center; padding: 40px;">
                <h2>✅ Google Calendar conectado correctamente</h2>
                <p>Ya puedes cerrar esta ventana. El sistema está listo para gestionar citas.</p>
            </body>
        </html>
        """)
    except ValueError:
        raise HTTPException(status_code=400, detail="State inválido (clinic_id no reconocido)")
    except Exception as e:
        logger.error("Error en callback OAuth Google: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error guardando tokens: {str(e)}")


@router.get("/google/{clinic_id}")
async def google_auth_start(clinic_id: UUID):
    """Inicia el flujo OAuth2 con Google Calendar para una clínica."""
    try:
        auth_url = get_authorization_url(clinic_id)
        return RedirectResponse(url=auth_url)
    except Exception as e:
        logger.error("Error iniciando OAuth Google: %s", e)
        raise HTTPException(status_code=500, detail="Error iniciando autenticación con Google")
