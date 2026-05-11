"use client";
import { Fragment, useState } from "react";
import Link from "next/link";

const CANAL_LABEL: Record<string, string> = {
  chat_web: "Chat web", whatsapp: "WhatsApp", voz: "Llamada",
};

const ESTADO_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  nuevo:         { label: "Nuevo",         bg: "#dbeafe", color: "#1d4ed8" },
  contactado:    { label: "Contactado",    bg: "#ede9fe", color: "#6d28d9" },
  interesado:    { label: "Interesado",    bg: "#fef3c7", color: "#92400e" },
  cita_agendada: { label: "Cita agendada", bg: "#dcfce7", color: "#166534" },
  completado:    { label: "Completado",    bg: "#f3f4f6", color: "#6b7280" },
  perdido:       { label: "Perdido",       bg: "#fee2e2", color: "#991b1b" },
  requiere_humano: { label: "Requiere humano", bg: "#fef3c7", color: "#92400e" },
};

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

type SortKey = "fecha" | "score";

function ScoreBadge({ scoring }: { scoring?: { score: number; nivel: string; motivos: string[] } }) {
  if (!scoring) return null;
  const { score, nivel } = scoring;
  const colors: Record<string, { bg: string; color: string }> = {
    alto:  { bg: "#dcfce7", color: "#166534" },
    medio: { bg: "#fef3c7", color: "#92400e" },
    bajo:  { bg: "#fee2e2", color: "#991b1b" },
  };
  const c = colors[nivel] ?? colors.bajo;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
      background: c.bg, color: c.color, display: "inline-flex", alignItems: "center", gap: 4,
    }} title={`Score: ${score}/100`}>
      {score}
    </span>
  );
}

export default function LeadsClient({ leads }: { leads: any[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("fecha");

  const toggle = (id: string) => setExpanded(prev => prev === id ? null : id);

  const sorted = [...leads].sort((a, b) => {
    if (sortBy === "score") {
      return (b.scoring?.score ?? 0) - (a.scoring?.score ?? 0);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em" }}>
            Leads
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: "#6b7280" }}>
            {leads.length} contacto{leads.length !== 1 ? "s" : ""} registrado{leads.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Sort + stat chips */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>Ordenar:</span>
          {(["fecha", "score"] as SortKey[]).map(k => (
            <button key={k} onClick={() => setSortBy(k)} style={{
              fontSize: 12, padding: "3px 10px", borderRadius: 20, cursor: "pointer",
              fontFamily: "inherit", fontWeight: sortBy === k ? 700 : 400,
              border: sortBy === k ? "1.5px solid #2563eb" : "1px solid #d1d5db",
              background: sortBy === k ? "#eff6ff" : "white",
              color: sortBy === k ? "#2563eb" : "#6b7280",
            }}>
              {k === "fecha" ? "Más reciente" : "Mayor score"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["nuevo", "cita_agendada"].map(e => {
            const count = leads.filter(l => l.estado_lead === e).length;
            const cfg = ESTADO_CONFIG[e];
            return (
              <span key={e} style={{
                fontSize: 12, fontWeight: 600,
                background: cfg.bg, color: cfg.color,
                padding: "4px 12px", borderRadius: 20,
              }}>
                {count} {cfg.label.toLowerCase()}
              </span>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              {["Paciente", "Score", "Teléfono", "Canal", "Estado", "Fecha", ""].map(h => (
                <th key={h} style={{
                  textAlign: "left", padding: "10px 16px",
                  fontSize: 11, fontWeight: 600, color: "#9ca3af",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 48, textAlign: "center", color: "#9ca3af", fontSize: 13.5 }}>
                  Sin leads todavía
                </td>
              </tr>
            )}
            {sorted.map((lead: any, i: number) => {
              const est = ESTADO_CONFIG[lead.estado_lead] || { label: lead.estado_lead, bg: "#f3f4f6", color: "#6b7280" };
              const pal = AVATAR_PALETTES[i % AVATAR_PALETTES.length];
              const isOpen = expanded === lead.id;

              return (
                <Fragment key={lead.id}>
                  <tr
                    onClick={() => toggle(lead.id)}
                    style={{
                      borderBottom: isOpen ? "none" : "1px solid #f3f4f6",
                      cursor: "pointer",
                      background: isOpen ? "#fafafa" : "white",
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: pal.bg, color: pal.color,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}>
                          {getInitials(lead.nombre)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#111827" }}>
                            {lead.nombre || <span style={{ color: "#9ca3af" }}>Anónimo</span>}
                          </div>
                          {lead.email && <div style={{ fontSize: 11.5, color: "#9ca3af" }}>{lead.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <ScoreBadge scoring={lead.scoring} />
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#374151" }}>
                      {lead.telefono || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#6b7280" }}>
                      {CANAL_LABEL[lead.canal_origen] || lead.canal_origen || "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        fontSize: 11.5, fontWeight: 600,
                        background: est.bg, color: est.color,
                        padding: "3px 9px", borderRadius: 20,
                      }}>
                        {est.label}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12.5, color: "#9ca3af" }}>
                      {new Date(lead.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <svg
                        width="14" height="14" viewBox="0 0 14 14" fill="none"
                        style={{ transition: "transform 0.15s", transform: isOpen ? "rotate(180deg)" : "none" }}
                      >
                        <path d="M3 5L7 9L11 5" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {isOpen && (
                    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td colSpan={7} style={{ padding: "0 16px 16px 56px", background: "#fafafa" }}>
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: 16,
                          padding: "14px 18px",
                          background: "white",
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                        }}>
                          {/* Info */}
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                              Información
                            </div>
                            <DetailRow label="Nombre" value={lead.nombre || "—"} />
                            <DetailRow label="Teléfono" value={lead.telefono || "—"} />
                            <DetailRow label="Email" value={lead.email || "—"} />
                            <DetailRow label="Canal" value={CANAL_LABEL[lead.canal_origen] || lead.canal_origen || "—"} />
                          </div>

                          {/* Estado y fechas */}
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                              Estado
                            </div>
                            <DetailRow label="Lead" value={est.label} />
                            <DetailRow
                              label="Alta"
                              value={new Date(lead.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                            />
                          </div>

                          {/* Resumen + acciones */}
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                              Resumen
                            </div>
                            {lead.historial_resumen ? (
                              <p style={{ fontSize: 12.5, color: "#374151", margin: "0 0 12px", lineHeight: 1.6 }}>
                                {lead.historial_resumen}
                              </p>
                            ) : (
                              <p style={{ fontSize: 12.5, color: "#9ca3af", margin: "0 0 12px" }}>Sin resumen disponible</p>
                            )}
                            <Link
                              href={`/panel/conversaciones`}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 6,
                                fontSize: 12.5, fontWeight: 600, color: "#2563eb",
                                textDecoration: "none",
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                                <path d="M11 1.5H2C1.72 1.5 1.5 1.72 1.5 2V8C1.5 8.28 1.72 8.5 2 8.5H3.5V11L6.5 8.5H11C11.28 8.5 11.5 8.28 11.5 8V2C11.5 1.72 11.28 1.5 11 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                              </svg>
                              Ver conversaciones
                            </Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: "#9ca3af" }}>{label}</span>
      <span style={{ fontSize: 12, color: "#111827", fontWeight: 500, textAlign: "right", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
      </span>
    </div>
  );
}
