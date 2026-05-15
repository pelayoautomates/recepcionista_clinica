-- 014_performance_indexes.sql
-- Indices para acelerar listados de panel y filtros frecuentes

CREATE INDEX IF NOT EXISTS idx_conversaciones_clinic_updated
  ON conversaciones (clinic_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversaciones_clinic_canal_paciente_created
  ON conversaciones (clinic_id, canal, paciente_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pacientes_clinic_created
  ON pacientes (clinic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lista_espera_clinic_created
  ON lista_espera (clinic_id, created_at DESC);
