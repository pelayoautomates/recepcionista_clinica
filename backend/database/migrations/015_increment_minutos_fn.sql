-- Función atómica para incrementar minutos usados del mes.
-- Evita race condition entre llamadas simultáneas al mismo clinic_id.
-- Ejecutar en Supabase SQL Editor.

CREATE OR REPLACE FUNCTION increment_minutos_mes(
  p_clinic_id uuid,
  p_delta     integer DEFAULT 1
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE clinicas
  SET minutos_usados_mes = COALESCE(minutos_usados_mes, 0) + p_delta
  WHERE id = p_clinic_id;
$$;
