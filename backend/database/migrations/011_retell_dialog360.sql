-- Migration 011: Retell per-clinic agent + 360dialog WhatsApp fields
-- Run in Supabase SQL Editor

-- Retell: each clinic has its own agent
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS retell_agent_id TEXT;

-- 360dialog: WhatsApp BSP credentials per clinic
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS dialog360_api_key     TEXT;
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS dialog360_phone_id    TEXT;  -- phone_number_id from 360dialog
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS dialog360_waba_id     TEXT;  -- WABA ID (WhatsApp Business Account)
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS dialog360_webhook_url TEXT;  -- our webhook URL registered with 360dialog

-- Index for fast lookup by Retell agent
CREATE INDEX IF NOT EXISTS idx_clinicas_retell_agent ON clinicas (retell_agent_id) WHERE retell_agent_id IS NOT NULL;

-- Index for fast lookup by 360dialog phone
CREATE INDEX IF NOT EXISTS idx_clinicas_dialog360_phone ON clinicas (dialog360_phone_id) WHERE dialog360_phone_id IS NOT NULL;
