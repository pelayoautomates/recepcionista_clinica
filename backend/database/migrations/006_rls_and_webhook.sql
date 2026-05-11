-- ============================================================
-- 006_rls_and_webhook.sql
--   1) RLS en tablas de 005 que se quedaron sin Row Level Security
--   2) Campo notif_webhook por clínica (Slack/Make/Zapier)
--   Ejecutar en SQL Editor de Supabase (una sola vez).
-- ============================================================

-- ── salas ────────────────────────────────────────────────────
ALTER TABLE salas ENABLE ROW LEVEL SECURITY;

-- Backend usa service_key → bypass RLS automático.
-- Políticas abiertas para no romper el backend; bloquean acceso anon directo.
CREATE POLICY "salas_select_own" ON salas
    FOR SELECT USING (true);

CREATE POLICY "salas_insert_own" ON salas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "salas_update_own" ON salas
    FOR UPDATE USING (true);

CREATE POLICY "salas_delete_own" ON salas
    FOR DELETE USING (true);


-- ── servicio_profesional ─────────────────────────────────────
ALTER TABLE servicio_profesional ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_select" ON servicio_profesional
    FOR SELECT USING (true);

CREATE POLICY "sp_insert" ON servicio_profesional
    FOR INSERT WITH CHECK (true);

CREATE POLICY "sp_delete" ON servicio_profesional
    FOR DELETE USING (true);


-- ── Verificar RLS en el resto de tablas (defensivo) ─────────
ALTER TABLE clinicas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversaciones             ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE profesionales              ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bloques_agenda             ENABLE ROW LEVEL SECURITY;
ALTER TABLE disponibilidad_profesional ENABLE ROW LEVEL SECURITY;


-- ── notif_webhook por clínica ────────────────────────────────
-- URL de webhook (Slack/Make/Zapier) opcional por clínica.
-- El backend hace POST aquí cuando el agente IA crea/cancela/mueve una cita.
-- Payload: { text: "...", tipo: "nueva_cita"|"cita_cancelada"|"cita_movida" }
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS notif_webhook TEXT;
