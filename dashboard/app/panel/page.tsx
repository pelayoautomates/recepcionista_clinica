import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import GoogleCalendarButton from "@/app/clinicas/[id]/GoogleCalendarButton";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";
const PUBLIC_BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const CANAL_LABEL: Record<string, string> = {
  chat_web: "Web",
  whatsapp: "WhatsApp",
  voz: "Voz",
};

const ESTADO_CONV: Record<string, { label: string; bg: string; color: string }> = {
  activa: { label: "Activa", bg: "#dcfce7", color: "#166534" },
  esperando_humano: { label: "Esperando respuesta", bg: "#fef9c3", color: "#854d0e" },
  resuelta: { label: "Resuelta", bg: "#f3f4f6", color: "#6b7280" },
};

const ESTADO_LEAD: Record<string, { label: string; color: string }> = {
  nuevo: { label: "Nuevo", color: "#2563eb" },
  contactado: { label: "Contactado", color: "#7c3aed" },
  cita_agendada: { label: "Cita agendada", color: "#166534" },
  perdido: { label: "Perdido", color: "#9ca3af" },
};

export default async function PanelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rolRes = await fetch(
    `${BACKEND}/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`,
    { cache: "no-store" }
  );
  const rol = await rolRes.json();
  const clinic_id = rol.clinic_id;

  const [clinicaRes, metricasRes, convsRes, leadsRes] = await Promise.all([
    fetch(`${BACKEND}/admin/clinicas/${clinic_id}`, { cache: "no-store" }),
    fetch(`${BACKEND}/admin/clinicas/${clinic_id}/metricas`, { cache: "no-store" }),
    fetch(`${BACKEND}/admin/clinicas/${clinic_id}/conversaciones`, { cache: "no-store" }),
    fetch(`${BACKEND}/admin/clinicas/${clinic_id}/leads`, { cache: "no-store" }),
  ]);

  const clinica = await clinicaRes.json();
  const metricas = await metricasRes.json();
  const todasConvs: any[] = convsRes.ok ? await convsRes.json() : [];
  const todosLeads: any[] = leadsRes.ok ? await leadsRes.json() : [];

  const hoy = new Date().toISOString().slice(0, 10);
  const convsHoy = todasConvs.filter(
    (c) => (c.updated_at || c.created_at || "").startsWith(hoy)
  );
  const leadsHoy = todosLeads.filter((l) => (l.created_at || "").startsWith(hoy));

  const tieneCalendario = !!clinica.google_tokens_enc;
  const googleAuthUrl = `${PUBLIC_BACKEND}/auth/google/${clinic_id}`;

  const metricsData = [
    { label: "Leads hoy", value: metricas.leads_hoy ?? 0, alert: false },
    { label: "Citas hoy", value: metricas.citas_hoy ?? 0, alert: false },
    {
      label: "Esperando respuesta",
      value: metricas.conversaciones_esperando_humano ?? 0,
      alert: (metricas.conversaciones_esperando_humano ?? 0) > 0,
    },
  ];

  return (
    <div>
      {/* Google Calendar banner */}
      {!tieneCalendario ? (
        <div style={{
          background: "#fef9c3", border: "1px solid #fde047", borderRadius: 8,
          padding: "10px 16px", marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#713f12" }}>
            <GoogleCalIcon />
            <span>Google Calendar no conectado — el agente no puede gestionar citas automáticamente.</span>
          </div>
          <GoogleCalendarButton url={googleAuthUrl} compact />
        </div>
      ) : (
        <div style={{
          background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8,
          padding: "8px 16px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#166534",
        }}>
          <GoogleCalIcon />
          <span>Google Calendar conectado — el agente gestiona tu agenda automáticamente.</span>
        </div>
      )}

      {/* Métricas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
        {metricsData.map(({ label, value, alert }) => (
          <div key={label} style={{
            background: alert ? "#fffbeb" : "white",
            border: `1px solid ${alert ? "#fcd34d" : "#e5e7eb"}`,
            borderRadius: 10, padding: "18px 22px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: alert ? "#b45309" : "#111827" }}>{value}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Conversaciones de hoy */}
        <div style={{ background: "white", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>Conversaciones de hoy</h2>
            <Link href="/panel/conversaciones" style={{ fontSize: 12, color: "#166534", textDecoration: "none" }}>Ver todas →</Link>
          </div>
          {convsHoy.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
              Sin conversaciones hoy
            </div>
          ) : (
            <div>
              {convsHoy.slice(0, 8).map((conv: any) => {
                const est = ESTADO_CONV[conv.estado] || ESTADO_CONV.activa;
                const hora = conv.updated_at
                  ? new Date(conv.updated_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                  : "—";
                return (
                  <Link key={conv.id} href={`/panel/conversaciones/${conv.id}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      padding: "11px 20px", borderBottom: "1px solid #f9fafb",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      cursor: "pointer",
                    }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f9fafb"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11, background: "#f3f4f6", color: "#374151", borderRadius: 4, padding: "2px 7px", fontWeight: 500 }}>
                          {CANAL_LABEL[conv.canal] || conv.canal || "—"}
                        </span>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>{hora}</span>
                      </div>
                      <span style={{
                        fontSize: 11, background: est.bg, color: est.color,
                        borderRadius: 10, padding: "2px 8px", fontWeight: 500,
                      }}>
                        {est.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Leads de hoy */}
        <div style={{ background: "white", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#111827" }}>Leads de hoy</h2>
            <Link href="/panel/leads" style={{ fontSize: 12, color: "#166534", textDecoration: "none" }}>Ver todos →</Link>
          </div>
          {leadsHoy.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
              Sin leads hoy
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  {["Nombre", "Teléfono", "Estado"].map((h) => (
                    <th key={h} style={{ padding: "8px 20px", textAlign: "left", fontWeight: 500, color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leadsHoy.slice(0, 8).map((lead: any) => {
                  const est = ESTADO_LEAD[lead.estado_lead] || { label: lead.estado_lead, color: "#6b7280" };
                  return (
                    <tr key={lead.id} style={{ borderBottom: "1px solid #f9fafb" }}>
                      <td style={{ padding: "10px 20px", fontWeight: 500, color: "#111827" }}>{lead.nombre || "—"}</td>
                      <td style={{ padding: "10px 20px", color: "#6b7280" }}>{lead.telefono || "—"}</td>
                      <td style={{ padding: "10px 20px" }}>
                        <span style={{ fontSize: 11, color: est.color, fontWeight: 600 }}>{est.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

function GoogleCalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <rect x="2" y="4" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="2" y1="9" x2="22" y2="9" stroke="currentColor" strokeWidth="1.5" />
      <line x1="7" y1="2" x2="7" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="17" y1="2" x2="17" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="6" y="13" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
