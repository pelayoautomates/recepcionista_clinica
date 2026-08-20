-- Fiabilidad minima de lanzamiento: unicidad tenant/canales y doble-booking.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Un usuario solo puede pertenecer a una clinica en el modelo actual.
CREATE UNIQUE INDEX IF NOT EXISTS clinica_usuarios_user_unique
  ON clinica_usuarios (user_id);

-- Un numero Meta no puede enrutar hacia dos tenants.
DROP INDEX IF EXISTS idx_clinicas_meta_phone_number_id;
CREATE UNIQUE INDEX IF NOT EXISTS clinicas_meta_phone_number_unique
  ON clinicas (meta_phone_number_id)
  WHERE meta_phone_number_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clinicas_phone_ai_unique
  ON clinicas (telefono_ia) WHERE telefono_ia IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS clinicas_telnyx_number_unique
  ON clinicas (telnyx_number_id) WHERE telnyx_number_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS clinicas_stripe_customer_unique
  ON clinicas (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS clinicas_stripe_subscription_unique
  ON clinicas (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Evita dos reservas simultaneas para el mismo profesional. La aplicacion
-- conserva las comprobaciones de buffers; esta constraint cierra la carrera.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'citas_profesional_no_overlap'
  ) THEN
    ALTER TABLE citas ADD CONSTRAINT citas_profesional_no_overlap
      EXCLUDE USING gist (
        profesional_id WITH =,
        tstzrange(fecha_inicio, fecha_fin, '[)') WITH &&
      )
      WHERE (
        profesional_id IS NOT NULL
        AND fecha_inicio IS NOT NULL
        AND fecha_fin IS NOT NULL
        AND estado NOT IN ('cancelada', 'no_asistio')
      );
  END IF;
END $$;

ALTER TABLE demo_requests FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE demo_requests FROM anon, authenticated;
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS attribution JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Los seguimientos comerciales quedan desactivados hasta registrar base legal.
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS sms_marketing_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sms_opted_out_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS pacientes_sms_suppression_idx
  ON pacientes (clinic_id, sms_opted_out_at)
  WHERE sms_opted_out_at IS NOT NULL;
