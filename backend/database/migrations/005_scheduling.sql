-- ============================================================
-- 005_scheduling.sql — Scheduling completo: salas, recursos,
--   reglas de reserva, buffer times, servicio↔profesional,
--   FKs citas→sala/profesional/conversacion, pacientes++
-- Ejecutar en el SQL Editor de Supabase (una sola vez)
-- ============================================================

-- ── 1. Servicios: campos scheduling ──────────────────────────────────────────

ALTER TABLE servicios ADD COLUMN IF NOT EXISTS precio              NUMERIC(10,2);
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS buffer_antes_min    INT DEFAULT 0;
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS buffer_despues_min  INT DEFAULT 0;
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS reservable_ia       BOOLEAN DEFAULT true;
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS requiere_revision   BOOLEAN DEFAULT false;
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS categoria           TEXT;


-- ── 2. Tabla salas / recursos ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS salas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id   UUID NOT NULL REFERENCES clinicas(id) ON DELETE CASCADE,
    nombre      TEXT NOT NULL,
    tipo        TEXT DEFAULT 'sala',   -- sala, box, cabina, camilla, maquina, otro
    capacidad   INT  DEFAULT 1,
    activo      BOOLEAN DEFAULT true,
    orden       INT  DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salas_clinic ON salas (clinic_id) WHERE activo = true;


-- ── 3. Servicio ↔ Profesional (many-to-many) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS servicio_profesional (
    servicio_id    UUID NOT NULL REFERENCES servicios(id)     ON DELETE CASCADE,
    profesional_id UUID NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
    PRIMARY KEY (servicio_id, profesional_id)
);


-- ── 4. Servicio → Sala requerida (opcional) ───────────────────────────────────

ALTER TABLE servicios ADD COLUMN IF NOT EXISTS sala_id UUID REFERENCES salas(id) ON DELETE SET NULL;


-- ── 5. Citas: FK profesional_id, sala_id, conversacion_id ────────────────────

ALTER TABLE citas ADD COLUMN IF NOT EXISTS profesional_id   UUID REFERENCES profesionales(id) ON DELETE SET NULL;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS sala_id          UUID REFERENCES salas(id)         ON DELETE SET NULL;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS conversacion_id  UUID REFERENCES conversaciones(id) ON DELETE SET NULL;

-- Estado adicional: needs_human_review, sync_failed
ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_estado_check;
ALTER TABLE citas ADD CONSTRAINT citas_estado_check
    CHECK (estado IN (
        'pendiente', 'confirmada', 'reprogramada',
        'completada', 'cancelada', 'no_asistio',
        'requiere_revision', 'sync_failed'
    ));

-- Indice para búsqueda de slots por profesional
CREATE INDEX IF NOT EXISTS idx_citas_profesional_id ON citas (profesional_id, fecha_inicio)
    WHERE estado NOT IN ('cancelada', 'no_asistio');

-- Indice para búsqueda de slots por sala
CREATE INDEX IF NOT EXISTS idx_citas_sala_id ON citas (sala_id, fecha_inicio)
    WHERE estado NOT IN ('cancelada', 'no_asistio');


-- ── 6. Conversaciones: cita asociada ─────────────────────────────────────────

ALTER TABLE conversaciones ADD COLUMN IF NOT EXISTS cita_id         UUID REFERENCES citas(id) ON DELETE SET NULL;
ALTER TABLE conversaciones ADD COLUMN IF NOT EXISTS servicio_interes TEXT;
ALTER TABLE conversaciones ADD COLUMN IF NOT EXISTS intencion        TEXT;


-- ── 7. Pacientes: campos CRM básico ──────────────────────────────────────────

ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS notas_internas    TEXT;
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS etiquetas         TEXT[]  DEFAULT '{}';
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS ultima_interaccion TIMESTAMPTZ;

-- Estado adicional: pendiente_confirmacion
ALTER TABLE pacientes DROP CONSTRAINT IF EXISTS pacientes_estado_lead_check;
ALTER TABLE pacientes ADD CONSTRAINT pacientes_estado_lead_check
    CHECK (estado_lead IN (
        'anonimo', 'nuevo', 'contactado', 'interesado',
        'cita_agendada', 'pendiente_confirmacion',
        'completado', 'perdido', 'requiere_humano'
    ));


-- ── 8. Bloques: campos adicionales ───────────────────────────────────────────

ALTER TABLE bloques_agenda ADD COLUMN IF NOT EXISTS profesional_id  UUID REFERENCES profesionales(id) ON DELETE SET NULL;
ALTER TABLE bloques_agenda ADD COLUMN IF NOT EXISTS sala_id         UUID REFERENCES salas(id)         ON DELETE SET NULL;
ALTER TABLE bloques_agenda ADD COLUMN IF NOT EXISTS notas           TEXT;

-- Tipos de bloqueo adicionales
ALTER TABLE bloques_agenda DROP CONSTRAINT IF EXISTS bloques_agenda_tipo_check;
ALTER TABLE bloques_agenda ADD CONSTRAINT bloques_agenda_tipo_check
    CHECK (tipo IN (
        'bloqueo', 'vacaciones', 'formacion', 'comida',
        'reunion', 'festivo', 'mantenimiento', 'ausencia', 'otro'
    ));


-- ── 9. Clínicas: reglas de reserva ───────────────────────────────────────────

ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS reglas_reserva JSONB DEFAULT '{
    "antelacion_min_horas": 1,
    "max_dias_adelante": 60,
    "intervalo_slots_min": 30,
    "permite_mismo_dia": true,
    "permite_cancelacion_ia": true,
    "permite_reprogramacion_ia": true,
    "horas_limite_cancelar": 24,
    "horas_limite_reprogramar": 24,
    "max_citas_simultaneas": 1
}'::jsonb;


-- ── 10. Profesionales: campos adicionales ─────────────────────────────────────

ALTER TABLE profesionales ADD COLUMN IF NOT EXISTS email              TEXT;
ALTER TABLE profesionales ADD COLUMN IF NOT EXISTS telefono           TEXT;
ALTER TABLE profesionales ADD COLUMN IF NOT EXISTS acepta_reservas_ia BOOLEAN DEFAULT true;
ALTER TABLE profesionales ADD COLUMN IF NOT EXISTS prioridad          INT DEFAULT 0;
