-- Migration 013: Twilio WhatsApp number per clinic
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS twilio_whatsapp_number TEXT;
