-- ============================================================
-- Recepcionista IA para Clínicas — Schema inicial
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ──────────────────────────────────────────────────────────────
-- CLÍNICAS (configuración por tenant)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinicas (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre               TEXT NOT NULL,
    telefono             TEXT,
    whatsapp_number      TEXT,
    email_contacto       TEXT,
    horarios             JSONB DEFAULT '{}'::jsonb,
    -- Ejemplo: { "lun": {"start": "09:00", "end": "20:00"}, "mar": {...}, ... }
    servicios            JSONB DEFAULT '[]'::jsonb,
    -- Ejemplo: [{ "nombre": "Limpieza dental", "duracion_min": 60, "precio_orientativo": 80 }]
    prompt_personalizado TEXT,
    google_tokens_enc    TEXT,   -- tokens OAuth cifrados con Fernet
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ──────────────────────────────────────────────────────────────
-- PACIENTES (un registro por persona real, multi-canal)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pacientes (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id         UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    nombre            TEXT,
    telefono          TEXT,
    email             TEXT,
    canal_origen      TEXT CHECK (canal_origen IN ('chat_web', 'whatsapp', 'voz')),
    estado_lead       TEXT NOT NULL DEFAULT 'nuevo'
                          CHECK (estado_lead IN (
                              'anonimo', 'nuevo', 'contactado', 'interesado',
                              'cita_agendada', 'completado', 'perdido', 'requiere_humano'
                          )),
    historial_resumen TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pacientes_clinic_id ON pacientes(clinic_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_telefono  ON pacientes(clinic_id, telefono);


-- ──────────────────────────────────────────────────────────────
-- CITAS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS citas (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id        UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    paciente_id      UUID REFERENCES pacientes(id) ON DELETE SET NULL,
    google_event_id  TEXT,
    tipo_servicio    TEXT,
    fecha_inicio     TIMESTAMPTZ,
    fecha_fin        TIMESTAMPTZ,
    estado           TEXT NOT NULL DEFAULT 'confirmada'
                         CHECK (estado IN ('confirmada', 'cancelada', 'completada', 'no_asistio')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_citas_clinic_id   ON citas(clinic_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha       ON citas(clinic_id, fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_citas_paciente_id ON citas(paciente_id);


-- ──────────────────────────────────────────────────────────────
-- CONVERSACIONES (mensajes por sesión)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversaciones (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id    UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    paciente_id  UUID REFERENCES pacientes(id) ON DELETE SET NULL,
    canal        TEXT CHECK (canal IN ('chat_web', 'whatsapp', 'voz')),
    mensajes     JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Array de: { "role": "user"|"assistant"|"tool", "content": "...", "timestamp": "..." }
    estado       TEXT NOT NULL DEFAULT 'activa'
                     CHECK (estado IN ('activa', 'esperando_humano', 'resuelta')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversaciones_clinic_id   ON conversaciones(clinic_id);
CREATE INDEX IF NOT EXISTS idx_conversaciones_paciente_id ON conversaciones(paciente_id);
CREATE INDEX IF NOT EXISTS idx_conversaciones_estado      ON conversaciones(clinic_id, estado);

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_conversaciones_updated_at
    BEFORE UPDATE ON conversaciones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ──────────────────────────────────────────────────────────────
-- JOBS (recordatorios, seguimientos, resumen diario)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id        UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    paciente_id      UUID REFERENCES pacientes(id) ON DELETE SET NULL,
    tipo             TEXT NOT NULL
                         CHECK (tipo IN (
                             'recordatorio_24h', 'recordatorio_1h',
                             'seguimiento_lead', 'resumen_diario'
                         )),
    fecha_programada TIMESTAMPTZ NOT NULL,
    estado           TEXT NOT NULL DEFAULT 'pendiente'
                         CHECK (estado IN ('pendiente', 'ejecutando', 'ejecutado', 'fallido')),
    idempotency_key  TEXT UNIQUE NOT NULL,
    payload          JSONB DEFAULT '{}'::jsonb,
    error            TEXT,
    intentos         INT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_pendientes ON jobs(fecha_programada)
    WHERE estado = 'pendiente';
CREATE INDEX IF NOT EXISTS idx_jobs_clinic_id ON jobs(clinic_id);


-- ──────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────
-- El backend usa service role key → bypass RLS
-- El dashboard usa anon key → RLS activo
-- Las policies se configuran según el método de auth del dashboard (cuando se implemente)

ALTER TABLE pacientes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversaciones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs            ENABLE ROW LEVEL SECURITY;

-- Por ahora: política permisiva para service role (backend)
-- Se añadirán policies restrictivas por clinic_id cuando se implemente auth del dashboard

-- Ejemplo de policy para dashboard (activar cuando haya auth):
-- CREATE POLICY "clinica_propia" ON pacientes
--     USING (clinic_id = (SELECT clinic_id FROM auth.users WHERE id = auth.uid()));
