-- ============================================================
-- 004_calendar.sql — Calendario completo: citas, profesionales,
--                    bloques, servicios y disponibilidad
-- Ejecutar en el SQL Editor de Supabase (una sola vez)
-- ============================================================

-- ── 1. Ampliar tabla citas ────────────────────────────────────────────────────

ALTER TABLE citas ADD COLUMN IF NOT EXISTS profesional       TEXT;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS notas_internas    TEXT;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS color             TEXT;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS duracion_min      INT;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS paciente_nombre   TEXT;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS paciente_telefono TEXT;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT now();
ALTER TABLE citas ADD COLUMN IF NOT EXISTS origen            TEXT DEFAULT 'manual'
    CHECK (origen IN ('manual', 'ia_llamada', 'ia_whatsapp', 'ia_chat', 'google_calendar'));

-- Estados completos (incluye reprogramada)
ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_estado_check;
ALTER TABLE citas ADD CONSTRAINT citas_estado_check
    CHECK (estado IN ('pendiente', 'confirmada', 'reprogramada', 'completada', 'cancelada', 'no_asistio'));


-- ── 2. Tabla profesionales ────────────────────────────────────────────────────

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


-- ── 3. Tabla bloques_agenda ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bloques_agenda (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id    UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    profesional  TEXT,
    titulo       TEXT NOT NULL,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin    TIMESTAMPTZ NOT NULL,
    tipo         TEXT NOT NULL DEFAULT 'bloqueo'
                     CHECK (tipo IN ('bloqueo', 'vacaciones', 'formacion', 'otro')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bloques_clinic_fecha ON bloques_agenda(clinic_id, fecha_inicio);

ALTER TABLE bloques_agenda ENABLE ROW LEVEL SECURITY;


-- ── 4. Tabla servicios ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS servicios (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id     UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    nombre        TEXT NOT NULL,
    duracion_min  INT NOT NULL DEFAULT 30,
    color         TEXT,
    descripcion   TEXT,
    activo        BOOLEAN NOT NULL DEFAULT true,
    orden         INT DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_servicios_clinic ON servicios(clinic_id) WHERE activo = true;

ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;


-- ── 5. Tabla disponibilidad_profesional ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS disponibilidad_profesional (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id      UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    profesional_id UUID NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
    dia_semana     INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=lunes, 6=domingo
    hora_inicio    TIME NOT NULL,
    hora_fin       TIME NOT NULL,
    activo         BOOLEAN NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (profesional_id, dia_semana)
);

CREATE INDEX IF NOT EXISTS idx_disponibilidad_prof ON disponibilidad_profesional(profesional_id) WHERE activo = true;

ALTER TABLE disponibilidad_profesional ENABLE ROW LEVEL SECURITY;


-- ── 6. Trigger updated_at en citas ───────────────────────────────────────────

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
