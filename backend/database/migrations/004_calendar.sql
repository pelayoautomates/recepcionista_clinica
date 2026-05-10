-- ============================================================
-- 004_calendar.sql — Funcionalidades completas de calendario
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- ── Ampliar tabla citas ──────────────────────────────────────

-- Profesional asignado (nombre libre o ID de profesional)
ALTER TABLE citas ADD COLUMN IF NOT EXISTS profesional TEXT;

-- Notas internas (solo visibles para la clínica)
ALTER TABLE citas ADD COLUMN IF NOT EXISTS notas_internas TEXT;

-- Color visual de la cita (override del color del profesional)
ALTER TABLE citas ADD COLUMN IF NOT EXISTS color TEXT;

-- Duración en minutos (redundante con fecha_fin, pero útil para display rápido)
ALTER TABLE citas ADD COLUMN IF NOT EXISTS duracion_min INT;

-- Nombre y teléfono del paciente desnormalizados (para citas sin paciente en BD)
ALTER TABLE citas ADD COLUMN IF NOT EXISTS paciente_nombre TEXT;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS paciente_telefono TEXT;

-- Ampliar estados: añadir 'pendiente' y 'no_asistio' ya existía como 'no_asistio'
-- Primero eliminamos la constraint existente
ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_estado_check;
-- La recreamos con todos los estados
ALTER TABLE citas ADD CONSTRAINT citas_estado_check
    CHECK (estado IN ('pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio'));


-- ── Tabla profesionales ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS profesionales (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id    UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    nombre       TEXT NOT NULL,
    color        TEXT NOT NULL DEFAULT '#2563eb',
    especialidad TEXT,
    activo       BOOLEAN NOT NULL DEFAULT true,
    orden        INT DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profesionales_clinic ON profesionales(clinic_id) WHERE activo = true;

ALTER TABLE profesionales ENABLE ROW LEVEL SECURITY;


-- ── Tabla bloques de agenda ──────────────────────────────────

CREATE TABLE IF NOT EXISTS bloques_agenda (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id    UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    profesional  TEXT,              -- nombre del profesional o NULL = toda la clínica
    titulo       TEXT NOT NULL,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin    TIMESTAMPTZ NOT NULL,
    tipo         TEXT NOT NULL DEFAULT 'bloqueo'
                     CHECK (tipo IN ('bloqueo', 'vacaciones', 'formacion', 'otro')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bloques_clinic_fecha ON bloques_agenda(clinic_id, fecha_inicio);

ALTER TABLE bloques_agenda ENABLE ROW LEVEL SECURITY;


-- ── Trigger updated_at en citas ──────────────────────────────

ALTER TABLE citas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION update_citas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_citas_updated_at ON citas;
CREATE TRIGGER trg_citas_updated_at
    BEFORE UPDATE ON citas
    FOR EACH ROW EXECUTE FUNCTION update_citas_updated_at();
