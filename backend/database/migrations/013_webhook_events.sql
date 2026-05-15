-- 013_webhook_events.sql
-- Dedupe de reintentos/replays de webhooks (Retell / WhatsApp providers)

CREATE TABLE IF NOT EXISTS webhook_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider      TEXT NOT NULL,
    event_key     TEXT NOT NULL,
    payload_sha256 TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_webhook_events_provider_key UNIQUE (provider, event_key)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);
