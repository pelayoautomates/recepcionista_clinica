import json
import logging
from uuid import UUID

from cryptography.fernet import Fernet
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow

from config import settings
from database.client import get_supabase

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/calendar"]

_fernet = Fernet(settings.fernet_key.encode())


def _encrypt(data: dict) -> str:
    return _fernet.encrypt(json.dumps(data).encode()).decode()


def _decrypt(token_enc: str) -> dict:
    return json.loads(_fernet.decrypt(token_enc.encode()).decode())


def get_oauth_flow(state: str | None = None) -> Flow:
    client_config = {
        "web": {
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uris": [settings.google_redirect_uri],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }
    flow = Flow.from_client_config(client_config, scopes=SCOPES, state=state)
    flow.redirect_uri = settings.google_redirect_uri
    return flow


def get_authorization_url(clinic_id: UUID) -> str:
    flow = get_oauth_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        state=str(clinic_id),
        prompt="consent",
    )
    return auth_url


def save_tokens(clinic_id: UUID, code: str, state: str) -> None:
    flow = get_oauth_flow(state=state)
    flow.fetch_token(code=code)
    creds = flow.credentials

    token_data = {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": list(creds.scopes or SCOPES),
    }

    encrypted = _encrypt(token_data)
    db = get_supabase()
    db.table("clinicas").update({"google_tokens_enc": encrypted}).eq("id", str(clinic_id)).execute()
    logger.info("Tokens de Google Calendar guardados para clínica %s", clinic_id)


def get_credentials(clinic_id: UUID) -> Credentials:
    db = get_supabase()
    result = db.table("clinicas").select("google_tokens_enc").eq("id", str(clinic_id)).single().execute()
    token_enc = result.data.get("google_tokens_enc")
    if not token_enc:
        raise ValueError(f"Clínica {clinic_id} no tiene Google Calendar conectado")

    token_data = _decrypt(token_enc)
    creds = Credentials(
        token=token_data["token"],
        refresh_token=token_data["refresh_token"],
        token_uri=token_data["token_uri"],
        client_id=token_data["client_id"],
        client_secret=token_data["client_secret"],
        scopes=token_data["scopes"],
    )

    if creds.expired and creds.refresh_token:
        import google.auth.transport.requests
        creds.refresh(google.auth.transport.requests.Request())
        # Guardar tokens renovados
        token_data["token"] = creds.token
        encrypted = _encrypt(token_data)
        db.table("clinicas").update({"google_tokens_enc": encrypted}).eq("id", str(clinic_id)).execute()

    return creds
