-- ============================================================
-- 008_audit_log.sql
--   Tabla de auditoría para registrar toda acción importante.
--   Quién hizo qué, cuándo, sobre qué entidad y qué cambió.
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID REFERENCES clinicas(id) ON DELETE CASCADE,
  actor           TEXT NOT NULL,          -- 'ia', 'humano:user_id', 'sistema', 'webhook'
  accion          TEXT NOT NULL,          -- 'cita.crear', 'cita.cancelar', 'lead.actualizar', etc.
  entidad         TEXT NOT NULL,          -- nombre de la tabla afectada
  entidad_id      UUID,                   -- id del registro afectado
  datos_antes     JSONB,                  -- estado previo (para updates/deletes)
  datos_despues   JSONB,                  -- estado nuevo (para creates/updates)
  canal           TEXT,                   -- 'chat_web', 'whatsapp', 'voz', 'panel', 'api'
  ip              TEXT,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_clinic_idx    ON audit_logs (clinic_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx   ON audit_logs (clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entidad_idx   ON audit_logs (entidad, entidad_id);

-- RLS: solo el propio tenant y service_role
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_own_clinic" ON audit_logs
  FOR SELECT USING (clinic_id = get_auth_clinic_id());

-- Solo service_role puede insertar logs (backend)
CREATE POLICY "audit_insert_deny" ON audit_logs
  FOR INSERT WITH CHECK (false);
