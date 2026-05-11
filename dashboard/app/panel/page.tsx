import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { adminFetch } from "@/lib/api";

const PUBLIC_BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const CANAL_LABEL: Record<string, string> = {
  chat_web: "Web", whatsapp: "WhatsApp", voz: "Llamada",
};

const CANAL_ICON: Record<string, React.ReactNode> = {
  whatsapp: (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 20, height: 20, borderRadius: "50%", background: "#25d366",
    }}>
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <path d="M5.5 1C3.01 1 1 3.01 1 5.5C1 6.35 1.23 7.14 1.63 7.82L1 10L3.25 9.4C3.91 9.76 4.68 9.97 5.5 9.97C7.99 9.97 10 7.96 10 5.47C10 2.98 7.99 1 5.5 1Z" fill="white" />
      </svg>
    </span>
  ),
  voz: (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 20, height: 20, borderRadius: "50%", background: "#f3f4f6",
    }}>
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <path d="M2 2.5C2 2.22 2.22 2 2.5 2H3.8L4.5 4L3.7 4.5C4.1 5.4 4.6 5.9 5.5 6.3L6 5.5L8 6.2V7.5C8 7.78 7.78 8 7.5 8C4.46 8 2 5.54 2 2.5Z" fill="#6b7280" />
      </svg>
    </span>
  ),
  chat_web: (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 20, height: 20, borderRadius: "50%", background: "#dbeafe",
    }}>
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <path d="M9 1H2C1.45 1 1 1.45 1 2V7.5C1 8.05 1.45 8.5 2 8.5H3.5V10.5L6 8.5H9C9.55 8.5 10 8.05 10 7.5V2C10 1.45 9.55 1 9 1Z" stroke="#2563eb" strokeWidth="1" strokeLinejoin="round" />
      </svg>
    </span>
  ),
};

const ESTADO_CONV: Record<string, { label: string; bg: string; color: string }> = {
  activa:           { label: "Activa",            bg: "#dcfce7", color: "#166534" },
  esperando_humano: { label: "Pendiente humano",  bg: "#fef3c7", color: "#92400e" },
  resuelta:         { label: "Resuelta",           bg: "#f1f5f9", color: "#64748b" },
};

const ESTADO_CITA: Record<string, { label: string; bg: string; color: string }> = {
  confirmada:       { label: "Confirmada",   bg: "#dcfce7", color: "#166534" },
  pendiente:        { label: "Pendiente",    bg: "#fef3c7", color: "#92400e" },
  reprogramada:     { label: "Reprogramada", bg: "#dbeafe", color: "#1d4ed8" },
  completada:       { label: "Completada",   bg: "#f1f5f9", color: "#64748b" },
  cancelada:        { label: "Cancelada",    bg: "#fee2e2", color: "#991b1b" },
  requiere_revision:{ label: "Revisar",      bg: "#fef3c7", color: "#92400e" },
};

function getLocalDateISO() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getInitials(name: string) {
  return (name || "?").split(" ").slice(0, 2).map((w: string) => w[0] || "").join("").toUpperCase();
}

const AVATAR_PALETTES = [
  { bg: "#dbeafe", color: "#1d4ed8" },
  { bg: "#dcfce7", color: "#166534" },
  { bg: "#fef3c7", color: "#92400e" },
  { bg: "#fce7f3", color: "#9d174d" },
  { bg: "#ede9fe", color: "#6d28d9" },
];

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

  const hoy = getLocalDateISO();

  const [clinicaRes, metricasRes, convsRes, citasRes] = await Promise.all([
    adminFetch(`/admin/clinicas/${clinic_id}`, { noStore: true }),
    adminFetch(`/admin/clinicas/${clinic_id}/metricas`, { noStore: true }),
    adminFetch(`/admin/clinicas/${clinic_id}/conversaciones`, { noStore: true }),
    adminFetch(`/admin/clinicas/${clinic_id}/citas?fecha=${hoy}`, { noStore: true }),
  ]);

  const clinica = await clinicaRes.json();
  const metricas = await metricasRes.json();
  const todasConvs: any[] = convsRes.ok ? await convsRes.json() : [];
  const citasHoy: any[] = citasRes.ok ? await citasRes.json() : [];

  const convsHoy = todasConvs
    .filter(c => (c.updated_at || c.created_at || "").startsWith(hoy))
    .slice(0, 6);

  const tieneCalendario = !!clinica.google_tokens_enc;
  const googleAuthUrl = `${PUBLIC_BACKEND}/auth/google/${clinic_id}`;
  const esperando: number = metricas.conversaciones_esperando_humano ?? 0;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          margin: "0 0 4px",
          fontSize: 24, fontWeight: 800,
          color: "#111827", letterSpacing: "-0.03em",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          Panel principal
          <span style={{ fontSize: 18 }}>✦</span>
        </h1>
        <p style={{ margin: 0, fontSize: 13.5, color: "#6b7280" }}>
          Controla tu recepcionista IA, tus conversaciones y tus citas en un solo lugar.
        </p>
      </div>


      {/* Metric cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 14,
        marginBottom: 24,
      }}>
        <MetricCard
          label="Conversaciones hoy"
          value={metricas.convs_hoy ?? convsHoy.length}
          icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M17 3H3C2.45 3 2 3.45 2 4V13C2 13.55 2.45 14 3 14H6V17.5L10.5 14H17C17.55 14 18 13.55 18 13V4C18 3.45 17.55 3 17 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>}
          iconBg="#dbeafe" iconColor="#2563eb"
          pct={metricas.convs_pct ?? null}
        />
        <MetricCard
          label="Citas agendadas hoy"
          value={metricas.citas_hoy ?? 0}
          icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="3.5" width="16" height="14.5" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M2 8.5H18M6.5 1.5V5.5M13.5 1.5V5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}
          iconBg="#d1fae5" iconColor="#059669"
          pct={metricas.citas_pct ?? null}
        />
        <MetricCard
          label="Leads captados hoy"
          value={metricas.leads_hoy ?? 0}
          icon={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" /><path d="M3 17C3 13.69 6.13 11 10 11C13.87 11 17 13.69 17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M14 4L16 6L20 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          iconBg="#ede9fe" iconColor="#7c3aed"
          pct={metricas.leads_pct ?? null}
        />
      </div>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, marginBottom: 16 }}>

        {/* Conversaciones recientes */}
        <div style={{
          background: "white", borderRadius: 12,
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f3f4f6",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827", letterSpacing: "-0.01em" }}>
              Conversaciones recientes
            </h2>
            <Link href="/panel/conversaciones" style={{ fontSize: 12.5, color: "#2563eb", fontWeight: 500 }}>
              Ver todas →
            </Link>
          </div>

          {convsHoy.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 13.5 }}>
              Sin conversaciones hoy
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  {["Paciente", "Canal", "Intención", "Estado", "Hora"].map(h => (
                    <th key={h} style={{
                      padding: "9px 16px", textAlign: "left",
                      fontSize: 11, fontWeight: 600, color: "#9ca3af",
                      textTransform: "uppercase", letterSpacing: "0.06em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {convsHoy.map((conv: any, i: number) => {
                  const est = ESTADO_CONV[conv.estado] || ESTADO_CONV.activa;
                  const hora = conv.updated_at
                    ? new Date(conv.updated_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                    : "—";
                  const nombre = conv.pacientes?.nombre || conv.paciente_id?.slice(0, 8) || "Desconocido";
                  const pal = AVATAR_PALETTES[i % AVATAR_PALETTES.length];
                  const msgs: any[] = Array.isArray(conv.mensajes) ? conv.mensajes : [];
                  const userMsg = msgs.filter((m: any) => m.role === "user").pop();
                  const intencion = userMsg?.content?.slice(0, 22) || "—";

                  return (
                    <Link key={conv.id} href={`/panel/conversaciones/${conv.id}`} style={{ display: "contents", textDecoration: "none" }}>
                      <tr style={{ borderBottom: "1px solid #f9fafb", cursor: "pointer" }}>
                        <td style={{ padding: "11px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: "50%",
                              background: pal.bg, color: pal.color,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 11, fontWeight: 700, flexShrink: 0,
                            }}>
                              {getInitials(nombre)}
                            </div>
                            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#111827" }}>{nombre}</span>
                          </div>
                        </td>
                        <td style={{ padding: "11px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            {CANAL_ICON[conv.canal] || null}
                            <span style={{ fontSize: 13, color: "#374151" }}>
                              {CANAL_LABEL[conv.canal] || conv.canal || "—"}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "11px 16px", fontSize: 13, color: "#6b7280" }}>{intencion}</td>
                        <td style={{ padding: "11px 16px" }}>
                          <span style={{
                            fontSize: 11.5, fontWeight: 600,
                            background: est.bg, color: est.color,
                            padding: "3px 9px", borderRadius: 20,
                          }}>
                            {est.label}
                          </span>
                        </td>
                        <td style={{ padding: "11px 16px", fontSize: 13, color: "#9ca3af" }}>{hora}</td>
                      </tr>
                    </Link>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Agenda de hoy */}
        <div style={{
          background: "white", borderRadius: 12,
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f3f4f6",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827", letterSpacing: "-0.01em" }}>
              Agenda de hoy
            </h2>
            <Link href="/panel/calendario" style={{ fontSize: 12.5, color: "#2563eb", fontWeight: 500 }}>
              Ver agenda →
            </Link>
          </div>

          {citasHoy.length === 0 ? (
            <div style={{ padding: "28px 20px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
              Sin citas hoy
            </div>
          ) : (
            <div style={{ padding: "6px 0" }}>
              {citasHoy.slice(0, 6).map((cita: any, i: number) => {
                const hora = cita.fecha_inicio
                  ? new Date(cita.fecha_inicio).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                  : "—";
                const estadoStyle = ESTADO_CITA[cita.estado] || ESTADO_CITA.confirmada;
                return (
                  <div key={cita.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "11px 20px",
                    borderBottom: i < Math.min(citasHoy.length, 6) - 1 ? "1px solid #f9fafb" : "none",
                  }}>
                    <div style={{
                      minWidth: 42, textAlign: "center",
                      fontSize: 12.5, fontWeight: 700, color: "#2563eb",
                    }}>
                      {hora}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "#111827" }}>
                        {cita.paciente_nombre || "Paciente"}
                      </div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>
                        {cita.tipo_servicio || "—"}{cita.profesional ? ` · ${cita.profesional}` : ""}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11.5, fontWeight: 600,
                      background: estadoStyle.bg, color: estadoStyle.color,
                      padding: "2px 9px", borderRadius: 20, whiteSpace: "nowrap",
                    }}>
                      {estadoStyle.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Alertas */}
      {esperando > 0 && (
        <div style={{
          background: "white", borderRadius: 12,
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "14px 20px",
            borderBottom: "1px solid #f3f4f6",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M8 6v3M8 10.5v.5" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Alertas importantes
            </h2>
            <Link href="/panel/conversaciones" style={{ fontSize: 12.5, color: "#2563eb", fontWeight: 500 }}>
              Ver todas →
            </Link>
          </div>
          <div style={{ padding: "4px 0" }}>
            <Link href="/panel/conversaciones" style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 20px",
                borderBottom: "1px solid #f9fafb",
                cursor: "pointer",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "#fef3c7",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M3 4C3 4 2.5 7 4.5 9C4.5 9 2.5 11 2.5 14H15.5C15.5 11 13.5 9 13.5 9C15.5 7 15 4 15 4" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 13.5, color: "#374151", fontWeight: 500 }}>
                    {esperando} paciente{esperando > 1 ? "s" : ""} esperando respuesta humana
                  </span>
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 4L10 8L6 12" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon, iconBg, iconColor, pct }: {
  label: string; value: number; icon: React.ReactNode;
  iconBg: string; iconColor: string;
  pct: number | null;
}) {
  const up = pct !== null && pct >= 0;
  const trendColor = pct === null ? "#9ca3af" : pct > 0 ? "#22c55e" : "#ef4444";
  const trendText = pct === null
    ? "Sin datos de ayer"
    : pct === 0
    ? "Igual que ayer"
    : `${pct > 0 ? "+" : ""}${pct}% vs ayer`;

  return (
    <div style={{
      background: "white", borderRadius: 12,
      border: "1px solid #e5e7eb",
      padding: "20px 22px",
      boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: iconBg, color: iconColor,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {icon}
        </div>
      </div>
      <div style={{
        fontSize: 32, fontWeight: 800, color: "#111827",
        letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 6,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
        {pct !== null && pct !== 0 && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            {up
              ? <path d="M2 9L6 3L10 9" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              : <path d="M2 3L6 9L10 3" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            }
          </svg>
        )}
        <span style={{ color: trendColor, fontWeight: 500 }}>{trendText}</span>
      </div>
    </div>
  );
}
