-- Solicitudes comerciales capturadas desde la web publica.
-- Solo el backend con service_role puede leer o escribir esta tabla.
CREATE TABLE IF NOT EXISTS demo_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name TEXT NOT NULL,
  website     TEXT,
  email       TEXT NOT NULL,
  phone       TEXT,
  specialty   TEXT,
  channels    TEXT[] NOT NULL DEFAULT '{}',
  notes       TEXT,
  source      TEXT NOT NULL DEFAULT 'website',
  status      TEXT NOT NULL DEFAULT 'new'
              CHECK (status IN ('new', 'contacted', 'demo', 'pilot', 'won', 'lost')),
  consent_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demo_requests_status_created_idx
  ON demo_requests (status, created_at DESC);

ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_requests_deny_all" ON demo_requests;
CREATE POLICY "demo_requests_deny_all" ON demo_requests
  FOR ALL USING (false) WITH CHECK (false);
