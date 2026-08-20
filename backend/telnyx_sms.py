import logging
import httpx
from config import settings

logger = logging.getLogger(__name__)

TELNYX_API = "https://api.telnyx.com/v2"


def to_e164(phone: str, default_country: str = "34") -> str:
    """Normaliza un número de teléfono a formato E.164. Asume España si no tiene prefijo."""
    p = phone.strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    if p.startswith("+"):
        return p
    if p.startswith("00"):
        return "+" + p[2:]
    if p.startswith("34") and len(p) == 11:
        return "+" + p
    return "+" + default_country + p


async def send_sms(to: str, text: str) -> bool:
    if not settings.telnyx_api_key or not settings.telnyx_sms_number:
        logger.warning("Telnyx SMS no configurado (TELNYX_API_KEY o TELNYX_SMS_NUMBER vacío)")
        return False

    to_e164_num = to_e164(to)

    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.post(
            f"{TELNYX_API}/messages",
            headers={
                "Authorization": f"Bearer {settings.telnyx_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.telnyx_sms_number,
                "to": to_e164_num,
                "text": text,
            },
        )

    if res.status_code not in (200, 201):
        logger.error("Telnyx SMS error %s → %s: %s", to_e164_num, res.status_code, res.text)
        return False

    logger.info("SMS enviado a %s", to_e164_num)
    return True


def recordatorio_cita(to: str, nombre_paciente: str, nombre_clinica: str,
                      servicio: str, fecha_texto: str, tipo: str) -> bool:
    import asyncio

    if tipo == "24h":
        texto = (
            f"Hola {nombre_paciente}, te recordamos tu cita en {nombre_clinica} "
            f"mañana {fecha_texto}"
            + (f" — {servicio}" if servicio else "")
            + ". Si necesitas cambiarla, contacta directamente con la clínica."
        )
    else:
        texto = (
            f"Hola {nombre_paciente}, tu cita en {nombre_clinica} es en 1 hora"
            + (f" ({servicio})" if servicio else "")
            + f" — {fecha_texto}."
        )

    return asyncio.run(send_sms(to, texto[:160]))


def seguimiento_lead(to: str, nombre_paciente: str, nombre_clinica: str) -> bool:
    import asyncio

    texto = (
        f"Hola {nombre_paciente}, soy el asistente de {nombre_clinica}. "
        "¿Pudimos ayudarte? Si necesitas pedir cita o tienes dudas, escríbenos."
    )
    return asyncio.run(send_sms(to, texto[:160]))
