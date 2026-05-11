-- ============================================================
-- 010_bloque6.sql
--   IA diferencial: lista de espera.
-- ============================================================

-- ── Lista de espera ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lista_espera (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
  paciente_id     UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  servicio_nombre TEXT,
  profesional_id  UUID REFERENCES profesionales(id) ON DELETE SET NULL,
  notas           TEXT,
  estado          TEXT NOT NULL DEFAULT 'esperando'
                      CHECK (estado IN ('esperando', 'notificado', 'agendado', 'cancelado')),
  notificado_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lista_espera_clinic ON lista_espera (clinic_id, estado, created_at);

ALTER TABLE lista_espera ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lista_espera_own_clinic" ON lista_espera
  FOR ALL USING (clinic_id = get_auth_clinic_id())
  WITH CHECK (clinic_id = get_auth_clinic_id());
