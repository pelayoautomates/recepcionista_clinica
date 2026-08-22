-- Preparación para pilotos: handoff durable, un solo scheduler activo y
-- consolidación de la columna de email de notificación.

-- ── 1. Cola durable de escaladas a humano ───────────────────────────────────
-- Hasta ahora el aviso de "esto lo tiene que ver una persona" se intentaba una
-- sola vez, en línea y con 5 s de timeout. Si el webhook de la clínica estaba
-- caído, la escalada se perdía sin reintento. Ahora es un job con la misma
-- política de reintentos que los recordatorios.
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_tipo_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_tipo_check
  CHECK (tipo IN (
      'recordatorio_24h', 'recordatorio_1h',
      'seguimiento_lead', 'resumen_diario',
      'escalada_humano'
  ));

-- Las escaladas pendientes son lo primero que hay que mirar en un incidente.
CREATE INDEX IF NOT EXISTS idx_jobs_escaladas_pendientes
  ON jobs (clinic_id, fecha_programada)
  WHERE tipo = 'escalada_humano' AND estado IN ('pendiente', 'ejecutando');


-- ── 2. Leader lock para el scheduler ────────────────────────────────────────
-- APScheduler arranca dentro de cada réplica del backend. El claim atómico de
-- `jobs` ya evita la doble ejecución de un job concreto, pero las tareas de
-- barrido (sync de Google Calendar, reset de períodos de facturación) no tienen
-- claim y se ejecutaban tantas veces como réplicas hubiera.
CREATE TABLE IF NOT EXISTS scheduler_locks (
    name       TEXT PRIMARY KEY,
    holder     TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE scheduler_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduler_locks FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE scheduler_locks FROM anon, authenticated;

-- Toma el lock si está libre, caducado, o si ya lo teníamos nosotros (renovación).
-- Todo en una sola sentencia para que sea atómico entre réplicas.
CREATE OR REPLACE FUNCTION try_acquire_scheduler_lock(
    p_name TEXT,
    p_holder TEXT,
    p_ttl_seconds INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_holder TEXT;
BEGIN
    INSERT INTO scheduler_locks (name, holder, expires_at, updated_at)
    VALUES (p_name, p_holder, now() + make_interval(secs => p_ttl_seconds), now())
    ON CONFLICT (name) DO UPDATE
        SET holder     = EXCLUDED.holder,
            expires_at = EXCLUDED.expires_at,
            updated_at = now()
        WHERE scheduler_locks.expires_at < now()
           OR scheduler_locks.holder = EXCLUDED.holder
    RETURNING holder INTO v_holder;

    RETURN v_holder IS NOT NULL AND v_holder = p_holder;
END;
$$;

REVOKE ALL ON FUNCTION try_acquire_scheduler_lock(TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION try_acquire_scheduler_lock(TEXT, TEXT, INTEGER) TO service_role;


-- ── 3. Una sola columna de email de notificación ────────────────────────────
-- La 003 creó `notif_email` y la 012 `notification_email`. El backend escribía
-- en una y leía la otra, así que el email que configurase una clínica no lo
-- usaba nadie. Se conserva `notif_email` (la que ya lee el panel).
UPDATE clinicas
   SET notif_email = notification_email
 WHERE notif_email IS NULL
   AND notification_email IS NOT NULL;

ALTER TABLE clinicas DROP COLUMN IF EXISTS notification_email;


-- ── 4. Avisos del linter de Supabase ────────────────────────────────────────
-- Los triggers de updated_at no fijaban search_path. No son SECURITY DEFINER,
-- así que el riesgo es bajo, pero se alinean con lo que la 018 ya hizo con el
-- resto de funciones.
ALTER FUNCTION update_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION update_citas_updated_at() SET search_path = public, pg_temp;

-- `auth.uid()` sin envolver se reevalúa una vez por fila. Envuelto en subconsulta
-- Postgres lo calcula una sola vez por consulta (initplan).
DROP POLICY IF EXISTS "clinica_usuarios_select_own" ON clinica_usuarios;
CREATE POLICY "clinica_usuarios_select_own" ON clinica_usuarios
  FOR SELECT USING (user_id = (SELECT auth.uid()));
