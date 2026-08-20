-- Cierra acceso directo a relaciones tenant y eventos internos.
-- Aplicar antes de reabrir el servicio a clientes.

ALTER TABLE clinica_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinica_usuarios FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinica_usuarios_insert" ON clinica_usuarios;
DROP POLICY IF EXISTS "clinica_usuarios_insert_own" ON clinica_usuarios;
DROP POLICY IF EXISTS "clinica_usuarios_update_own" ON clinica_usuarios;
DROP POLICY IF EXISTS "clinica_usuarios_delete_own" ON clinica_usuarios;

REVOKE INSERT, UPDATE, DELETE ON TABLE clinica_usuarios FROM anon, authenticated;

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_events_deny_all" ON webhook_events;
CREATE POLICY "webhook_events_deny_all" ON webhook_events
  FOR ALL USING (false) WITH CHECK (false);

REVOKE ALL ON TABLE webhook_events FROM anon, authenticated;

-- Evita que objetos con nombres manipulados cambien la resolucion dentro de
-- funciones SECURITY DEFINER.
ALTER FUNCTION get_auth_clinic_id() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION get_auth_clinic_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_auth_clinic_id() TO authenticated;

ALTER FUNCTION increment_minutos_mes(UUID, INTEGER) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION increment_minutos_mes(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_minutos_mes(UUID, INTEGER) TO service_role;

-- Las herramientas de agenda ya usan este estado al invalidar recordatorios.
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_estado_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_estado_check
  CHECK (estado IN ('pendiente', 'ejecutando', 'ejecutado', 'fallido', 'cancelado'));
