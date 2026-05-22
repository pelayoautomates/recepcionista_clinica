"""
Cliente centralizado de WhatsApp (Meta Cloud API).
Todas las operaciones de envío de mensajes pasan por aquí.
"""
import logging

import httpx

from config import settings

logger = logging.getLogger(__name__)


def _graph_url() -> str:
    return f"https://graph.facebook.com/{settings.meta_graph_version}"


def _phone_number_id(clinic_whatsapp_number: str | None) -> str:
    """Devuelve el phone_number_id correcto: per-clínica o global como fallback."""
    return clinic_whatsapp_number or settings.meta_phone_number_id


async def send_text(
    to: str,
    body: str,
    clinic_whatsapp_number: str | None = None,
    access_token: str | None = None,
) -> bool:
    """
    Envía un mensaje de texto por WhatsApp.
    Devuelve True si el envío fue OK, False si hubo error.
    No lanza excepciones — fallo silencioso con log.
    """
    phone_id = _phone_number_id(clinic_whatsapp_number)
    token = access_token or settings.meta_access_token
    if not phone_id or not token:
        logger.debug("WhatsApp no configurado — mensaje no enviado a %s", to)
        return False

    numero = to.strip().replace(" ", "").replace("-", "")
    if not numero.startswith("+"):
        numero = f"+{numero}"

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.post(
                f"{_graph_url()}/{phone_id}/messages",
                json={
                    "messaging_product": "whatsapp",
                    "to": numero,
                    "type": "text",
                    "text": {"body": body},
                },
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
        if resp.status_code >= 400:
            logger.warning("WhatsApp send error %s → %s: %s", numero, resp.status_code, resp.text[:200])
            return False
        return True
    except Exception as exc:
        logger.warning("WhatsApp send exception → %s: %s", numero, exc)
        return False


async def confirmacion_cita(
    to: str,
    nombre_paciente: str,
    nombre_clinica: str,
    servicio: str,
    profesional: str,
    fecha_texto: str,
    clinic_whatsapp_number: str | None = None,
    access_token: str | None = None,
) -> bool:
    """Envía confirmación de cita recién agendada al paciente."""
    body = (
        f"✅ ¡Cita confirmada, {nombre_paciente}!\n\n"
        f"📍 {nombre_clinica}\n"
        f"🗓 {fecha_texto}\n"
        f"💆 {servicio}"
        + (f"\n👤 {profesional}" if profesional and profesional != "—" else "")
        + "\n\nResponde a este mensaje si necesitas cambiar o cancelar tu cita."
    )
    return await send_text(to, body, clinic_whatsapp_number, access_token)


async def recordatorio_cita(
    to: str,
    nombre_paciente: str,
    nombre_clinica: str,
    servicio: str,
    fecha_texto: str,
    tipo: str,  # "24h" | "1h"
    clinic_whatsapp_number: str | None = None,
    access_token: str | None = None,
) -> bool:
    """Envía recordatorio de cita 24h o 1h antes."""
    cuando = "mañana" if tipo == "24h" else "en aproximadamente 1 hora"
    servicio_txt = f" ({servicio})" if servicio else ""
    body = (
        f"🔔 Recordatorio de cita\n\n"
        f"Hola {nombre_paciente}, tienes una cita{servicio_txt} {cuando} en {nombre_clinica}:\n"
        f"📅 {fecha_texto}\n\n"
        f"Responde CANCELAR o MOVER si necesitas cambiarla."
    )
    return await send_text(to, body, clinic_whatsapp_number, access_token)


async def seguimiento_lead(
    to: str,
    nombre_paciente: str,
    clinic_whatsapp_number: str | None = None,
    access_token: str | None = None,
) -> bool:
    """Mensaje de recuperación para lead frío."""
    saludo = f"Hola {nombre_paciente}" if nombre_paciente else "Hola"
    body = (
        f"{saludo}, ¿pudiste resolver tu consulta? "
        f"Seguimos aquí para ayudarte a encontrar el hueco que mejor te venga. 😊"
    )
    return await send_text(to, body, clinic_whatsapp_number, access_token)
