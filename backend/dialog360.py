"""
360dialog WhatsApp BSP client.
360dialog wraps Meta's WhatsApp Cloud API with simpler per-clinic API keys.
Docs: https://docs.360dialog.com/whatsapp-api/whatsapp-api/media
"""
import logging
import tempfile
import os

import httpx

logger = logging.getLogger(__name__)

DIALOG360_BASE = "https://waba.360dialog.io/v1"


async def send_message(api_key: str, to: str, text: str) -> bool:
    """Send a plain text WhatsApp message via 360dialog."""
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "text",
        "text": {"preview_url": False, "body": text},
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                f"{DIALOG360_BASE}/messages",
                json=payload,
                headers={"D360-API-KEY": api_key, "Content-Type": "application/json"},
            )
            if res.status_code >= 400:
                logger.error("360dialog send failed %s: %s", res.status_code, res.text[:300])
                return False
            return True
    except Exception as e:
        logger.error("360dialog send error: %s", e)
        return False


async def send_template(api_key: str, to: str, template_name: str, lang: str = "es", components: list | None = None) -> bool:
    """Send an approved template message (for reminders, follow-ups)."""
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": lang},
            "components": components or [],
        },
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(
                f"{DIALOG360_BASE}/messages",
                json=payload,
                headers={"D360-API-KEY": api_key, "Content-Type": "application/json"},
            )
            if res.status_code >= 400:
                logger.error("360dialog template failed %s: %s", res.status_code, res.text[:300])
                return False
            return True
    except Exception as e:
        logger.error("360dialog template error: %s", e)
        return False


async def download_media(api_key: str, media_id: str) -> bytes | None:
    """Download media file (audio, image) from 360dialog."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Get media URL
            res = await client.get(
                f"{DIALOG360_BASE}/media/{media_id}",
                headers={"D360-API-KEY": api_key},
            )
            res.raise_for_status()
            data = res.json()
            media_url = data.get("url")
            if not media_url:
                return None
            # Download media
            media_res = await client.get(
                media_url,
                headers={"D360-API-KEY": api_key},
            )
            media_res.raise_for_status()
            return media_res.content
    except Exception as e:
        logger.error("360dialog download media error: %s", e)
        return None


async def transcribe_audio(api_key: str, audio_id: str, openai_api_key: str) -> str:
    """Download audio from 360dialog and transcribe with Whisper."""
    from openai import AsyncOpenAI

    audio_bytes = await download_media(api_key, audio_id)
    if not audio_bytes:
        return ""

    with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as f:
        f.write(audio_bytes)
        tmp_path = f.name

    try:
        client = AsyncOpenAI(api_key=openai_api_key)
        with open(tmp_path, "rb") as audio_file:
            transcript = await client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="es",
            )
        return transcript.text
    finally:
        os.unlink(tmp_path)


async def get_clinic_by_phone_id(phone_number_id: str) -> dict | None:
    """Look up clinic by dialog360_phone_id."""
    from database.client import get_supabase
    db = get_supabase()
    res = db.table("clinicas").select("id, dialog360_api_key").eq("dialog360_phone_id", phone_number_id).limit(1).execute()
    return res.data[0] if res.data else None
