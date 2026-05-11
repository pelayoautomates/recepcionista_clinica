-- ============================================================
-- 007_rls_policies.sql
--   RLS policies reales basadas en clinic_id del usuario autenticado.
--   El backend usa service_role → bypassa RLS automáticamente.
--   Estas políticas protegen acceso directo con anon_key.
--
--   Ejecutar en SQL Editor de Supabase (una sola vez).
-- ============================================================

-- ── Helper: obtener clinic_id del usuario autenticado ────────
CREATE OR REPLACE FUNCTION get_auth_clinic_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT clinic_id
  FROM clinica_usuarios
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ── clinica_usuarios: solo ver/modificar la propia fila ──────
DROP POLICY IF EXISTS "clinica_usuarios_select" ON clinica_usuarios;
DROP POLICY IF EXISTS "clinica_usuarios_insert" ON clinica_usuarios;

CREATE POLICY "clinica_usuarios_select_own" ON clinica_usuarios
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "clinica_usuarios_insert_own" ON clinica_usuarios
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ── clinicas: solo ver la propia clínica ────────────────────
DROP POLICY IF EXISTS "clinicas_select" ON clinicas;
DROP POLICY IF EXISTS "clinicas_insert" ON clinicas;
DROP POLICY IF EXISTS "clinicas_update" ON clinicas;
DROP POLICY IF EXISTS "clinicas_delete" ON clinicas;

CREATE POLICY "clinicas_select_own" ON clinicas
  FOR SELECT USING (id = get_auth_clinic_id());

-- Inserción solo vía backend (service_role), anon y auth NO pueden insertar
CREATE POLICY "clinicas_no_direct_insert" ON clinicas
  FOR INSERT WITH CHECK (false);

CREATE POLICY "clinicas_no_direct_update" ON clinicas
  FOR UPDATE USING (false);

CREATE POLICY "clinicas_no_direct_delete" ON clinicas
  FOR DELETE USING (false);

-- ── pacientes ────────────────────────────────────────────────
DROP POLICY IF EXISTS "pacientes_select" ON pacientes;
DROP POLICY IF EXISTS "pacientes_insert" ON pacientes;
DROP POLICY IF EXISTS "pacientes_update" ON pacientes;
DROP POLICY IF EXISTS "pacientes_delete" ON pacientes;

CREATE POLICY "pacientes_own_clinic" ON pacientes
  FOR ALL USING (clinic_id = get_auth_clinic_id())
  WITH CHECK (clinic_id = get_auth_clinic_id());

-- ── conversaciones ───────────────────────────────────────────
DROP POLICY IF EXISTS "conversaciones_select" ON conversaciones;
DROP POLICY IF EXISTS "conversaciones_insert" ON conversaciones;
DROP POLICY IF EXISTS "conversaciones_update" ON conversaciones;

CREATE POLICY "conversaciones_own_clinic" ON conversaciones
  FOR ALL USING (clinic_id = get_auth_clinic_id())
  WITH CHECK (clinic_id = get_auth_clinic_id());

-- ── citas ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "citas_select" ON citas;
DROP POLICY IF EXISTS "citas_insert" ON citas;
DROP POLICY IF EXISTS "citas_update" ON citas;
DROP POLICY IF EXISTS "citas_delete" ON citas;

CREATE POLICY "citas_own_clinic" ON citas
  FOR ALL USING (clinic_id = get_auth_clinic_id())
  WITH CHECK (clinic_id = get_auth_clinic_id());

-- ── profesionales ────────────────────────────────────────────
DROP POLICY IF EXISTS "profesionales_select" ON profesionales;
DROP POLICY IF EXISTS "profesionales_insert" ON profesionales;
DROP POLICY IF EXISTS "profesionales_update" ON profesionales;
DROP POLICY IF EXISTS "profesionales_delete" ON profesionales;

CREATE POLICY "profesionales_own_clinic" ON profesionales
  FOR ALL USING (clinic_id = get_auth_clinic_id())
  WITH CHECK (clinic_id = get_auth_clinic_id());

-- ── servicios ────────────────────────────────────────────────
DROP POLICY IF EXISTS "servicios_select" ON servicios;
DROP POLICY IF EXISTS "servicios_insert" ON servicios;
DROP POLICY IF EXISTS "servicios_update" ON servicios;
DROP POLICY IF EXISTS "servicios_delete" ON servicios;

CREATE POLICY "servicios_own_clinic" ON servicios
  FOR ALL USING (clinic_id = get_auth_clinic_id())
  WITH CHECK (clinic_id = get_auth_clinic_id());

-- ── bloques_agenda ───────────────────────────────────────────
DROP POLICY IF EXISTS "bloques_select" ON bloques_agenda;
DROP POLICY IF EXISTS "bloques_insert" ON bloques_agenda;
DROP POLICY IF EXISTS "bloques_update" ON bloques_agenda;
DROP POLICY IF EXISTS "bloques_delete" ON bloques_agenda;

CREATE POLICY "bloques_own_clinic" ON bloques_agenda
  FOR ALL USING (clinic_id = get_auth_clinic_id())
  WITH CHECK (clinic_id = get_auth_clinic_id());

-- ── disponibilidad_profesional ───────────────────────────────
DROP POLICY IF EXISTS "disponibilidad_select" ON disponibilidad_profesional;
DROP POLICY IF EXISTS "disponibilidad_insert" ON disponibilidad_profesional;
DROP POLICY IF EXISTS "disponibilidad_update" ON disponibilidad_profesional;
DROP POLICY IF EXISTS "disponibilidad_delete" ON disponibilidad_profesional;

CREATE POLICY "disponibilidad_own_clinic" ON disponibilidad_profesional
  FOR ALL USING (clinic_id = get_auth_clinic_id())
  WITH CHECK (clinic_id = get_auth_clinic_id());

-- ── salas ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "salas_select_own" ON salas;
DROP POLICY IF EXISTS "salas_insert_own" ON salas;
DROP POLICY IF EXISTS "salas_update_own" ON salas;
DROP POLICY IF EXISTS "salas_delete_own" ON salas;

CREATE POLICY "salas_own_clinic" ON salas
  FOR ALL USING (clinic_id = get_auth_clinic_id())
  WITH CHECK (clinic_id = get_auth_clinic_id());

-- ── servicio_profesional ─────────────────────────────────────
-- Tabla de unión: verificar via JOIN a servicios (que ya tiene clinic_id)
DROP POLICY IF EXISTS "sp_select" ON servicio_profesional;
DROP POLICY IF EXISTS "sp_insert" ON servicio_profesional;
DROP POLICY IF EXISTS "sp_delete" ON servicio_profesional;

CREATE POLICY "sp_own_clinic" ON servicio_profesional
  FOR ALL USING (
    servicio_id IN (
      SELECT id FROM servicios WHERE clinic_id = get_auth_clinic_id()
    )
  )
  WITH CHECK (
    servicio_id IN (
      SELECT id FROM servicios WHERE clinic_id = get_auth_clinic_id()
    )
  );

-- ── jobs ─────────────────────────────────────────────────────
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_own_clinic" ON jobs
  FOR ALL USING (clinic_id = get_auth_clinic_id())
  WITH CHECK (clinic_id = get_auth_clinic_id());

-- ── invitaciones: solo ver la propia clínica ────────────────
ALTER TABLE invitaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitaciones_own_clinic" ON invitaciones
  FOR ALL USING (clinic_id = get_auth_clinic_id())
  WITH CHECK (clinic_id = get_auth_clinic_id());

-- ── agencia_admins: sin acceso directo ───────────────────────
ALTER TABLE agencia_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agencia_admins_deny_all" ON agencia_admins
  FOR ALL USING (false);
