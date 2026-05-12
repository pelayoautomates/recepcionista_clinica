-- Migration 012: routing mode + notification email
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS routing_mode TEXT DEFAULT 'siempre'
  CHECK (routing_mode IN ('siempre', 'fuera_horario', 'si_no_contestan'));

ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS notification_email TEXT;
