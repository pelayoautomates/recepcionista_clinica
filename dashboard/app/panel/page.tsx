import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import GoogleCalendarButton from "@/app/clinicas/[id]/GoogleCalendarButton";
import { adminFetch } from "@/lib/api";
import { GoogleCalendarLogo } from "@/components/BrandLogos";

const PUBLIC_BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const CANAL_LABEL: Record<string, string> = {
  chat_web: "Web",
  whatsapp: "WhatsApp",
  voz: "Voz",
};

const CANAL_COLOR: Record<string, { bg: string; color: string }> = {
  chat_web:  { bg: "#eff6ff", color: "#1d4ed8" },
  whatsapp:  { bg: "#f0fdf4", color: "#166534" },
  voz:       { bg: "#faf5ff", color: "#6d28d9" },
};

const ESTADO_CONV: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  activa:           { label: "Activa",             bg: "#dcfce7", color: "#166534", dot: "#22c55e" },
  esperando_humano: { label: "Esperando respuesta", bg: "#fef9c3", color: "#854d0e", dot: "#f59e0b" },
  resuelta:         { label: "Resuelta",            bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" },
};

const ESTADO_LEAD: Record<string, { label: string; color: string }> = {
  nuevo:          { label: "Nuevo",          color: "#2563eb" },
  contactado:     { label: "Contactado",     color: "#7c3aed" },
  cita_agendada:  { label: "Cita agendada",  color: "#166534" },
  perdido:        { label: "Perdido",        color: "#94a3b8" },
};

export default async function PanelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rolRes = await adminFetch(
    `/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`,
    { noStore: true }
  );
  const rol = await rolRes.json();
  const clinic_id = rol.clinic_id;

  const [clinicaRes, metricasRes, convsRes, leadsRes] = await Promise.all([
    adminFetch(`/admin/clinicas/${clinic_id}`, { noStore: true }),
    adminFetch(`/admin/clinicas/${clinic_id}/metricas`, { noStore: true }),
    adminFetch(`/admin/clinicas/${clinic_id}/conversaciones`, { noStore: true }),
    adminFetch(`/admin/clinicas/${clinic_id}/leads`, { noStore: true }),
  ]);

  const clinica = await clinicaRes.json();
  const metricas = await metricasRes.json();
  const todasConvs: any[] = convsRes.ok ? await convsRes.json() : [];
  const todosLeads: any[] = leadsRes.ok ? await leadsRes.json() : [];

  const hoy = new Date().toISOString().slice(0, 10);
  const convsHoy = todasConvs.filter(c => (c.updated_at || c.created_at || "").startsWith(hoy));
  const leadsHoy = todosLeads.filter(l => (l.created_at || "").startsWith(hoy));

  const tieneCalendario = !!clinica.google_tokens_enc;
  const googleAuthUrl = `${PUBLIC_BACKEND}/auth/google/${clinic_id}`;

  const esperando = metricas.conversaciones_esperando_humano ?? 0;

  return (
    <div>
      {/* Google Calendar banner */}
      {!tieneCalendario ? (
        <div style={{
          background: "white",
          border: "1px solid #fde68a",
          borderLeft: "3px solid #f59e0b",
          borderRadius: 8,
          padding: "12px 18px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "#713f12" }}>
            <GoogleCalendarLogo />
            <span>Google Calendar no conectado — el agente no puede gestionar citas automáticamente.</span>
          </div>
          <GoogleCalendarButton url={googleAuthUrl} compact />
        </div>
      ) : (
        <div style={{
          background: "white",
          border: "1px solid #bbf7d0",
          borderLeft: "3px solid #22c55e",
          borderRadius: 8,
          padding: "10px 16px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13, color: "#166534",
        }}>
          <GoogleCalendarLogo />
          <span style={{ fontWeight: 500 }}>Google Calendar conectado</span>
          <span style={{ color: "#4ade80" }}>·</span>
          <span style={{ color: "#15803d" }}>El agente gestiona tu agenda automáticamente</span>
        </div>
      )}

      {/* Métricas */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 12,
        marginBottom: 28,
      }}>
        <MetricTile
          label="Leads hoy"
          value={metricas.leads_hoy ?? 0}
          accent="#6366f1"
          href="/panel/leads"
        />
        <MetricTile
          label="Citas hoy"
          value={metricas.citas_hoy ?? 0}
          accent="#16a34a"
          href="/panel/citas"
        />
        <MetricTile
          label="Esperando respuesta"
          value={esperando}
          accent={esperando > 0 ? "#f59e0b" : "#94a3b8"}
          alert={esperando > 0}
          href="/panel/conversaciones"
        />
      </div>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Conversaciones de hoy */}
        <div style={{
          background: "white",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "15px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>
              Conversaciones de hoy
            </h2>
            <Link href="/panel/conversaciones" style={{
              fontSize: 12, color: "#16a34a", fontWeight: 500,
            }}>
              Ver todas →
            </Link>
          </div>
          {convsHoy.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>
              Sin conversaciones hoy
            </div>
          ) : (
            <div>
              {convsHoy.slice(0, 8).map((conv: any) => {
                const est = ESTADO_CONV[conv.estado] || ESTADO_CONV.activa;
                const canal = CANAL_COLOR[conv.canal] || { bg: "#f8fafc", color: "#64748b" };
                const hora = conv.updated_at
                  ? new Date(conv.updated_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                  : "—";
                return (
                  <Link key={conv.id} href={`/panel/conversaciones/${conv.id}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      padding: "11px 20px",
                      borderBottom: "1px solid #f8fafc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          background: canal.bg, color: canal.color,
                          borderRadius: 5, padding: "2px 7px",
                        }}>
                          {CANAL_LABEL[conv.canal] || conv.canal || "—"}
                        </span>
                        <span style={{ fontSize: 12.5, color: "#94a3b8" }}>{hora}</span>
                      </div>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: 11, fontWeight: 500,
                        background: est.bg, color: est.color,
                        borderRadius: 20, padding: "2px 9px",
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: est.dot }} />
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
        <div style={{
          background: "white",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "15px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>
              Leads de hoy
            </h2>
            <Link href="/panel/leads" style={{ fontSize: 12, color: "#16a34a", fontWeight: 500 }}>
              Ver todos →
            </Link>
          </div>
          {leadsHoy.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13.5 }}>
              Sin leads hoy
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Nombre", "Teléfono", "Estado"].map(h => (
                    <th key={h} style={{
                      padding: "9px 20px",
                      textAlign: "left",
                      fontWeight: 600, fontSize: 11,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      borderBottom: "1px solid #f1f5f9",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leadsHoy.slice(0, 8).map((lead: any) => {
                  const est = ESTADO_LEAD[lead.estado_lead] || { label: lead.estado_lead, color: "#64748b" };
                  return (
                    <tr key={lead.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "10px 20px", fontWeight: 600, color: "#0f172a", fontSize: 13 }}>
                        {lead.nombre || "—"}
                      </td>
                      <td style={{ padding: "10px 20px", color: "#64748b", fontSize: 13 }}>
                        {lead.telefono || "—"}
                      </td>
                      <td style={{ padding: "10px 20px" }}>
                        <span style={{ fontSize: 11.5, color: est.color, fontWeight: 600 }}>
                          {est.label}
                        </span>
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

function MetricTile({ label, value, accent, alert, href }: {
  label: string; value: number; accent: string; alert?: boolean; href: string;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div style={{
        background: alert ? "#fffbeb" : "white",
        border: "1px solid #e2e8f0",
        borderTop: `3px solid ${accent}`,
        borderRadius: 10,
        padding: "20px 22px",
        boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
        cursor: "pointer",
      }}>
        <div style={{
          fontSize: 32, fontWeight: 800,
          color: alert ? "#b45309" : "#0f172a",
          letterSpacing: "-0.04em",
          lineHeight: 1, marginBottom: 7,
        }}>
          {value}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 600,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}>
          {label}
        </div>
      </div>
    </Link>
  );
}
