import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import GoogleCalendarButton from "@/app/clinicas/[id]/GoogleCalendarButton";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";
const PUBLIC_BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default async function PanelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rolRes = await fetch(`${BACKEND}/me/rol?user_id=${user.id}&email=${user.email}`);
  const rol = await rolRes.json();
  const clinic_id = rol.clinic_id;

  const [clinicaRes, metricasRes] = await Promise.all([
    fetch(`${BACKEND}/admin/clinicas/${clinic_id}`, { cache: "no-store" }),
    fetch(`${BACKEND}/admin/clinicas/${clinic_id}/metricas`, { cache: "no-store" }),
  ]);
  const clinica = await clinicaRes.json();
  const metricas = await metricasRes.json();

  const tieneCalendario = !!clinica.google_tokens_enc;
  const googleAuthUrl = `${PUBLIC_BACKEND}/auth/google/${clinic_id}`;

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>Bienvenido, {clinica.nombre}</h1>

      {/* Métricas */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Leads hoy", value: metricas.leads_hoy },
          { label: "Citas hoy", value: metricas.citas_hoy },
          { label: "Esperando respuesta", value: metricas.conversaciones_esperando_humano, alert: metricas.conversaciones_esperando_humano > 0 },
        ].map(({ label, value, alert }) => (
          <div key={label} style={{
            background: alert ? "#fef3c7" : "white",
            border: `1px solid ${alert ? "#f59e0b" : "#e5e7eb"}`,
            borderRadius: 8, padding: "16px 24px", flex: 1,
          }}>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Google Calendar */}
        <div style={{ background: "white", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>Google Calendar</h2>
          {tieneCalendario ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>✅</span>
              <span style={{ fontSize: 14, color: "#166534" }}>Conectado — el agente puede gestionar tu agenda</span>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px" }}>
                Conecta tu Google Calendar para que el agente pueda ver tu disponibilidad y crear citas.
              </p>
              <GoogleCalendarButton url={googleAuthUrl} />
            </div>
          )}
        </div>

        {/* Accesos rápidos */}
        <div style={{ background: "white", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>Accesos rápidos</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { href: "/panel/conversaciones", label: "Ver conversaciones activas" },
              { href: "/panel/leads", label: "Ver leads pendientes" },
              { href: "/panel/citas", label: "Ver citas de hoy" },
              { href: "/panel/configuracion", label: "Editar configuración" },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{
                fontSize: 14, color: "#1a1a2e", textDecoration: "none",
                padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb",
                display: "block",
              }}>
                {label} →
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
