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

    # WhatsApp / Meta
    meta_app_id: str = ""
    meta_graph_version: str = "v21.0"
    meta_verify_token: str = ""
    meta_access_token: str = ""        # token global legacy
    meta_phone_number_id: str = ""     # phone_number_id global legacy
    meta_app_secret: str = ""          # validar firma X-Hub-Signature-256

    # Retell AI (voz)
    retell_api_key: str = ""   # API key de Retell — también usada para validar firmas
    retell_agent_id: str = ""  # ID del agente en Retell (para crear llamadas salientes)
    retell_ws_secret: str = ""  # Secreto para proteger /retell/llm-websocket (query ?token=...)
    # Voz de los agentes creados (ver /list-voices en Retell). El agente se
    # presenta como Valeria, así que el default masculino "11labs-Adrian" sonaba
    # incoherente en la primera frase de la llamada.
    retell_voice_id: str = "azure-es-ES-ElviraNeural"

    # YCloud (BSP de WhatsApp — alternativa a Meta directo, permite Coexistence)
    ycloud_api_key: str = ""         # X-API-Key de la cuenta YCloud
    ycloud_webhook_secret: str = ""  # Secreto para validar la cabecera YCloud-Signature
    # Plantilla aprobada por Meta para recordatorios de cita. Sin ella no se puede
    # escribir a un paciente que lleva mas de 24 h sin responder.
    # Params esperados: {{1}} nombre, {{2}} clinica, {{3}} fecha y hora.
    ycloud_template_recordatorio: str = ""

    # Telnyx (números de teléfono + SMS)
    telnyx_api_key: str = ""
    telnyx_sip_connection_id: str = ""  # ID of the Telnyx SIP connection
    telnyx_sip_subdomain: str = "retell-clinica.sip.telnyx.com"  # termination URI for Retell
    telnyx_sms_number: str = ""  # Número remitente SMS (ej: +34910000001)

    # Seguridad
    admin_api_key: str = ""  # Protege endpoints /admin/* (requerido en producción)
    # Orígenes CORS permitidos, separados por coma. "*" para dev.
    allowed_origins: str = "*"

    # App
    base_url: str = "http://localhost:8000"
    environment: str = "development"

    # Twilio WhatsApp
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_number: str = "whatsapp:+14155238886"  # sandbox por defecto

    # Notificaciones (opcional)
    notify_webhook_url: str = ""  # URL para notificar escaladas a humano (Slack/Make/etc.)
    marketing_sms_enabled: bool = False  # Solo tras consentimiento/suppression list operativos

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_starter: str = ""   # price_xxx del plan Starter en Stripe
    stripe_price_pro: str = ""       # price_xxx del plan Pro
    stripe_price_growth: str = ""    # price_xxx del plan Growth
    dashboard_url: str = "https://atiende360.com"  # para redirect después de checkout

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


settings = Settings()
