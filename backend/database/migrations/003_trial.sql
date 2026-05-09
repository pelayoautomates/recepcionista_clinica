-- ============================================================
-- SaaS self-service: trial, plan, onboarding y producción
-- Ejecutar en el SQL Editor de Supabase (una sola vez)
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- BLOQUE 1 — Trial y onboarding
-- ──────────────────────────────────────────────────────────────

ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS trial_expires_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan              TEXT NOT NULL DEFAULT 'trial'
    CHECK (plan IN ('trial', 'starter', 'pro', 'growth', 'cancelado')),
  ADD COLUMN IF NOT EXISTS onboarding_step   INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_ok     BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_clinicas_trial ON clinicas(trial_expires_at)
  WHERE plan = 'trial';


-- ──────────────────────────────────────────────────────────────
-- BLOQUE 2 — Info de clínica ampliada
-- ──────────────────────────────────────────────────────────────

ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS url_web           TEXT,
  ADD COLUMN IF NOT EXISTS especialidad      TEXT,
  -- Nombre personalizable del agente IA (evitar "Valeria" hardcodeado en prompts.py)
  ADD COLUMN IF NOT EXISTS agente_nombre     TEXT NOT NULL DEFAULT 'Valeria',
  -- Email destino para resumen diario y alertas (puede diferir del email_contacto)
  ADD COLUMN IF NOT EXISTS notif_email       TEXT;


-- ──────────────────────────────────────────────────────────────
-- BLOQUE 3 — Telefonía (separar número IA del número de contacto)
-- ──────────────────────────────────────────────────────────────
-- PROBLEMA ACTUAL: el campo "telefono" se usaba para ambos.
-- "telefono"    = número de contacto humano de la clínica (el de su web/tarjeta)
-- "telefono_ia" = número Telnyx/Retell que atiende el agente IA
-- "telnyx_number_id" = ID interno de Telnyx (para gestionar/cancelar el número vía API)

ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS telefono_ia       TEXT,
  ADD COLUMN IF NOT EXISTS telnyx_number_id  TEXT;


-- ──────────────────────────────────────────────────────────────
-- BLOQUE 4 — Retell por clínica
-- ──────────────────────────────────────────────────────────────
-- PROBLEMA ACTUAL: settings.retell_agent_id es global (env var).
-- Con varias clínicas cada una necesita su propio agente Retell
-- para tener su propio system prompt, voz y configuración.

ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS retell_agent_id   TEXT;


-- ──────────────────────────────────────────────────────────────
-- BLOQUE 5 — Stripe (columnas preparadas, integración más adelante)
-- ──────────────────────────────────────────────────────────────

ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS stripe_customer_id          TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status  TEXT DEFAULT 'trialing'
    CHECK (stripe_subscription_status IN (
      'trialing', 'active', 'past_due', 'canceled', 'unpaid', NULL
    ));

CREATE INDEX IF NOT EXISTS idx_clinicas_stripe_customer ON clinicas(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;


-- ──────────────────────────────────────────────────────────────
-- BLOQUE 6 — Control de uso de minutos
-- ──────────────────────────────────────────────────────────────
-- minutos_usados_mes  = contador del mes en curso (se resetea en billing_period_start)
-- billing_period_start = inicio del período de facturación actual
-- minutos_incluidos   = minutos asignados según el plan activo
--   (se actualiza al cambiar de plan; evita leer el plan y calcular en caliente)

ALTER TABLE clinicas
  ADD COLUMN IF NOT EXISTS minutos_usados_mes    INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_period_start  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS minutos_incluidos     INT;

-- Valor inicial para clínicas existentes: asignar según plan
UPDATE clinicas SET minutos_incluidos = CASE
  WHEN plan = 'starter' THEN 300
  WHEN plan = 'pro'     THEN 750
  WHEN plan = 'growth'  THEN 1800
  ELSE 100  -- trial: 100 min de prueba
END
WHERE minutos_incluidos IS NULL;
