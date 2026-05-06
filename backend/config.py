from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Busca .env en backend/ y también en la raíz del proyecto
_here = Path(__file__).parent
_env_files = [_here / ".env", _here.parent / ".env"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[str(f) for f in _env_files],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Supabase
    supabase_url: str
    supabase_service_key: str
    supabase_anon_key: str

    # OpenAI
    openai_api_key: str

    # Google Calendar
    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str

    # Cifrado tokens OAuth
    fernet_key: str

    # WhatsApp (opcional hasta que se conecte Meta)
    meta_verify_token: str = "token_provisional"
    meta_access_token: str = ""
    meta_phone_number_id: str = ""
    meta_app_secret: str = ""  # Para validar firma X-Hub-Signature-256

    # Vapi (opcional)
    vapi_api_key: str = ""

    # Seguridad
    admin_api_key: str = ""  # Protege endpoints /admin/* (requerido en producción)
    # Orígenes CORS permitidos, separados por coma. "*" para dev.
    allowed_origins: str = "*"

    # App
    base_url: str = "http://localhost:8000"
    environment: str = "development"

    # Notificaciones (opcional)
    notify_webhook_url: str = ""  # URL para notificar escaladas a humano (Slack/Make/etc.)

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


settings = Settings()
