-- ============================================================
-- 005_services_availability.sql — Servicios, disponibilidad, origen y estados
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de 004_calendar.sql
-- ============================================================

-- ── 1. Origen de la cita ─────────────────────────────────────────────────────
-- Indica cómo se creó: IA llamada, IA WhatsApp, manual, etc.
ALTER TABLE citas ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'manual'
    CHECK (origen IN ('manual', 'ia_llamada', 'ia_whatsapp', 'ia_chat', 'google_calendar'));

-- ── 2. Añadir estado 'reprogramada' a citas ──────────────────────────────────
ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_estado_check;
ALTER TABLE citas ADD CONSTRAINT citas_estado_check
    CHECK (estado IN ('pendiente', 'confirmada', 'reprogramada', 'completada', 'cancelada', 'no_asistio'));

-- ── 3. Tabla servicios ───────────────────────────────────────────────────────
-- Catálogo de servicios de cada clínica (primera consulta, limpieza, etc.)
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

-- ── 4. Tabla disponibilidad_profesional ──────────────────────────────────────
-- Horario semanal de cada profesional: qué días y de qué hora a qué hora trabaja
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
