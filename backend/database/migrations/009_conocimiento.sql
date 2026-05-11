-- ============================================================
-- 009_conocimiento.sql
--   Base de conocimiento por clínica.
--   El agente IA inyecta las entradas activas en su system prompt.
-- ============================================================

CREATE TABLE IF NOT EXISTS conocimientos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  titulo      TEXT NOT NULL,
  contenido   TEXT NOT NULL,
  tipo        TEXT NOT NULL DEFAULT 'faq'
                  CHECK (tipo IN ('faq', 'proceso', 'precio', 'politica', 'otro')),
  activo      BOOLEAN NOT NULL DEFAULT true,
  orden       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conocimientos_clinic ON conocimientos (clinic_id, activo, orden);

ALTER TABLE conocimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conocimientos_own_clinic" ON conocimientos
  FOR ALL USING (clinic_id = get_auth_clinic_id())
  WITH CHECK (clinic_id = get_auth_clinic_id());
