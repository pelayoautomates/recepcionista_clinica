-- ============================================================
-- Migration 016: Meta Embedded Signup + limpieza 360dialog
-- ============================================================
-- Contexto: sustituimos 360dialog y Twilio WhatsApp por Meta
-- Embedded Signup. Cada clínica conecta su propio número desde
-- el panel sin tocar credenciales externas.
-- ============================================================

-- Nuevas columnas: credenciales Meta por clínica
ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS meta_waba_id          TEXT,
  ADD COLUMN IF NOT EXISTS meta_phone_number_id  TEXT,
  ADD COLUMN IF NOT EXISTS meta_phone_number     TEXT,
  ADD COLUMN IF NOT EXISTS meta_access_token     TEXT;  -- cifrado con Fernet

-- Índice para enrutar webhooks entrantes por phone_number_id
CREATE INDEX IF NOT EXISTS idx_clinicas_meta_phone_number_id
  ON clinicas (meta_phone_number_id)
  WHERE meta_phone_number_id IS NOT NULL;

-- ── Limpieza: columnas 360dialog obsoletas ───────────────────
-- 360dialog se reemplaza por Meta Embedded Signup
DROP INDEX IF EXISTS idx_clinicas_dialog360_phone;

ALTER TABLE clinicas
  DROP COLUMN IF EXISTS dialog360_api_key,
  DROP COLUMN IF EXISTS dialog360_phone_id,
  DROP COLUMN IF EXISTS dialog360_waba_id,
  DROP COLUMN IF EXISTS dialog360_webhook_url;

-- ── Limpieza: columna Twilio WhatsApp obsoleta ───────────────
-- Twilio WhatsApp también se reemplaza. Se mantiene como legacy
-- hasta confirmar que no hay clínicas activas en él.
-- Descomentar cuando se confirme:
-- ALTER TABLE clinicas DROP COLUMN IF EXISTS twilio_whatsapp_number;
