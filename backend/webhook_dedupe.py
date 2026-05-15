import hashlib
import logging

from database.client import get_supabase

logger = logging.getLogger(__name__)


def _normalize_key(event_key: str) -> str:
    key = (event_key or "").strip()
    if not key:
        return ""
    if len(key) <= 190:
        return key
    return "sha256:" + hashlib.sha256(key.encode("utf-8")).hexdigest()


def mark_webhook_event_once(provider: str, event_key: str, payload_text: str | None = None) -> bool:
    """
    Returns True only for the first time an event_key is seen for that provider.
    Duplicate deliveries return False.
    Fail-open: if storage fails unexpectedly, returns True to avoid dropping traffic.
    """
    provider_norm = (provider or "").strip().lower()
    key_norm = _normalize_key(event_key)
    if not provider_norm or not key_norm:
        return True

    payload_sha = hashlib.sha256(payload_text.encode("utf-8")).hexdigest() if payload_text else None
    db = get_supabase()
    try:
        db.table("webhook_events").insert(
            {"provider": provider_norm, "event_key": key_norm, "payload_sha256": payload_sha}
        ).execute()
        return True
    except Exception as e:
        # Duplicate key = retry/replay, do not process twice.
        msg = str(e).lower()
        if "23505" in msg or "duplicate key" in msg or "unique constraint" in msg:
            return False
        logger.warning("webhook_dedupe storage error for %s/%s: %s", provider_norm, key_norm, e)
        return True
