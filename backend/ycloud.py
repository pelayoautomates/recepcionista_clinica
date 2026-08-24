"""
Cliente de YCloud (BSP de WhatsApp).

Alternativa a hablar directamente con la Cloud API de Meta. Se añade en vez de
sustituir: una clínica puede estar en Meta directo o en YCloud, y el resto del
producto —agente, agenda, panel, facturación— no se entera de la diferencia.

El motivo de existir de esta capa es Coexistence: con YCloud la clínica conserva
su app de WhatsApp Business en el móvil mientras la IA contesta por la API sobre
el mismo número. Conectar un número a Meta directo se la quitaba, que era el
mayor punto de fricción del alta.

Docs: https://docs.ycloud.com/reference/whatsapp-message-sending-guide
"""
import hashlib
import hmac
import logging
import re
import time

import httpx

from config import settings

logger = logging.getLogger(__name__)

API_BASE = "https://api.ycloud.com/v2"
# Ventana de tolerancia para la firma. Igual criterio que el webhook de Retell:
# suficiente para un reintento legítimo, corta para un replay.
_SIGNATURE_MAX_AGE_SECONDS = 5 * 60


def is_configured() -> bool:
    return bool((settings.ycloud_api_key or "").strip())


def _headers() -> dict:
    return {
        "X-API-Key": settings.ycloud_api_key,
        "Content-Type": "application/json",
    }


def verify_signature(raw_body: bytes, signature_header: str) -> bool:
    """
    Valida la cabecera `YCloud-Signature: t=<unix_ts>,s=<hmac_hex>`.

    La firma es HMAC-SHA256 de "{timestamp}.{body}" con el secreto del webhook.
    Sin secreto configurado se rechaza en producción: un webhook de WhatsApp sin
    firmar es una puerta abierta a que cualquiera hable en nombre de un paciente.
    """
    secret = (settings.ycloud_webhook_secret or "").strip()
    if not secret:
        if settings.is_production:
            logger.error("YCLOUD_WEBHOOK_SECRET no configurado: webhook rechazado")
            return False
        return True

    match = re.match(r"^t=(\d+),\s*s=([0-9a-fA-F]+)$", (signature_header or "").strip())
    if not match:
        return False

    timestamp, received = match.groups()
    if abs(int(time.time()) - int(timestamp)) > _SIGNATURE_MAX_AGE_SECONDS:
        return False

    expected = hmac.new(
        secret.encode("utf-8"),
        msg=f"{timestamp}.".encode("utf-8") + raw_body,
        digestmod=hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, received.lower())


def to_e164(numero: str) -> str:
    """YCloud identifica los números en E.164 sin el '+'."""
    limpio = re.sub(r"[^\d+]", "", numero or "")
    return limpio.lstrip("+")


async def send_text(desde: str, para: str, texto: str) -> bool:
    """
    Envía texto libre. Solo funciona dentro de la ventana de 24 h desde el último
    mensaje del paciente; fuera de ella Meta exige plantilla (ver send_template).
    Devuelve True si YCloud aceptó el envío.
    """
    if not is_configured():
        logger.debug("YCloud no configurado — mensaje no enviado a %s", para)
        return False

    payload = {
        "from": to_e164(desde),
        "to": to_e164(para),
        "type": "text",
        "text": {"body": texto},
    }
    return await _enviar(payload, destino=para)


async def send_template(
    desde: str,
    para: str,
    nombre_plantilla: str,
    parametros: list[str],
    idioma: str = "es",
) -> bool:
    """
    Envía una plantilla aprobada por Meta. Es la única forma de escribir a un
    paciente que lleva más de 24 h sin responder — por ejemplo, un recordatorio
    de cita del día siguiente.
    """
    if not is_configured():
        return False

    payload = {
        "from": to_e164(desde),
        "to": to_e164(para),
        "type": "template",
        "template": {
            "name": nombre_plantilla,
            "language": {"code": idioma, "policy": "deterministic"},
            "components": [
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": str(p)} for p in parametros],
                }
            ],
        },
    }
    return await _enviar(payload, destino=para)


async def _enviar(payload: dict, destino: str) -> bool:
    """Envío común. No lanza: el caller decide qué hacer si no sale."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                f"{API_BASE}/whatsapp/messages/sendDirectly",
                json=payload,
                headers=_headers(),
            )
        if res.status_code >= 400:
            logger.warning(
                "YCloud send error %s → %s: %s", destino, res.status_code, res.text[:300]
            )
            return False
        return True
    except Exception as exc:
        logger.warning("YCloud send exception → %s: %s", destino, exc)
        return False


def extraer_mensaje(body: dict) -> dict | None:
    """
    Normaliza el webhook de YCloud a la forma que espera el router.

    Solo interesa `whatsapp.inbound.message`; el resto de eventos (estados de
    entrega, plantillas aprobadas) se ignoran sin ruido.
    """
    if body.get("type") != "whatsapp.inbound.message":
        return None

    mensaje = body.get("whatsappInboundMessage") or {}
    tipo = mensaje.get("type")

    texto = ""
    if tipo == "text":
        texto = ((mensaje.get("text") or {}).get("body") or "").strip()

    return {
        "id": mensaje.get("id") or body.get("id") or "",
        "de": mensaje.get("from") or "",
        "para": mensaje.get("to") or "",
        "tipo": tipo,
        "texto": texto,
    }
