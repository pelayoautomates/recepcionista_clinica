"""Twilio WhatsApp client."""
import logging

import httpx

from config import settings

logger = logging.getLogger(__name__)

TWILIO_API = "https://api.twilio.com/2010-04-01"


async def send_message(to: str, text: str) -> bool:
    """Send a WhatsApp message via Twilio. to = phone number with country code."""
    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        logger.warning("Twilio no configurado — mensaje no enviado")
        return False

    to_wa = f"whatsapp:{to}" if not to.startswith("whatsapp:") else to
    url = f"{TWILIO_API}/Accounts/{settings.twilio_account_sid}/Messages.json"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                url,
                data={
                    "From": settings.twilio_whatsapp_number,
                    "To": to_wa,
                    "Body": text,
                },
                auth=(settings.twilio_account_sid, settings.twilio_auth_token),
            )
        if res.status_code in (200, 201):
            return True
        logger.warning("Twilio send failed %s: %s", res.status_code, res.text)
        return False
    except Exception as e:
        logger.error("Twilio network error: %s", e)
        return False


async def get_clinic_by_twilio_number(to_number: str):
    """Look up clinic by their Twilio WhatsApp number."""
    from database.client import get_supabase
    db = get_supabase()
    res = (
        db.table("clinicas")
        .select("id, nombre")
        .eq("twilio_whatsapp_number", to_number)
        .limit(1)
        .execute()
    )
    if res.data:
        return res.data[0]
    # Dev fallback: return first clinic
    fallback = db.table("clinicas").select("id, nombre").limit(1).execute()
    return fallback.data[0] if fallback.data else None
