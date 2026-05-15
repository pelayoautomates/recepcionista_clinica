"use client";
import { useState } from "react";

const CANAL_LABEL: Record<string, string> = {
  chat_web: "Chat web",
  whatsapp: "WhatsApp",
  voz: "Llamada",
};

type Lead = {
  id: string;
  nombre: string | null;
  telefono: string | null;
  email: string | null;
  canal_origen: string | null;
  estado_lead: string;
  created_at: string;
  historial_resumen: string | null;
  scoring?: { score: number; nivel: string; motivos: string[] };
};

function ScoreBadge({ scoring }: { scoring?: Lead["scoring"] }) {
  if (!scoring) return null;
  const colors: Record<string, { bg: string; color: string }> = {
    alto: { bg: "#dcfce7", color: "#166534" },
    medio: { bg: "#fef3c7", color: "#92400e" },
    bajo: { bg: "#fee2e2", color: "#991b1b" },
  };
  const c = colors[scoring.nivel] ?? colors.bajo;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: c.bg, color: c.color }} title={`Score: ${scoring.score}/100`}>
      {scoring.score}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export default function RecuperacionClient({
  clinicId,
  initialLeads,
}: {
  clinicId: string;
  initialLeads: Lead[];
}) {
  const [leads] = useState<Lead[]>(initialLeads);
  const [enviando, setEnviando] = useState<Record<string, "loading" | "ok" | "error">>({});

  async function reenganchar(lead: Lead) {
    setEnviando((prev) => ({ ...prev, [lead.id]: "loading" }));
    try {
      const res = await fetch(`/api/clinicas/${clinicId}/leads/${lead.id}/seguimiento`, {
        method: "POST",
      });
      setEnviando((prev) => ({ ...prev, [lead.id]: res.ok ? "ok" : "error" }));
    } catch {
      setEnviando((prev) => ({ ...prev, [lead.id]: "error" }));
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#111827" }}>Recuperacion de leads</h1>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
          Leads perdidos o sin actividad reciente con telefono disponible.
          {leads.length > 0 && ` ${leads.length} para reenganchar.`}
        </p>
      </div>

      {leads.length === 0 ? (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "36px 24px", textAlign: "center" }}>
          <p style={{ margin: 0, color: "#9ca3af", fontSize: 14 }}>Sin leads para recuperar ahora mismo.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {leads.map((lead) => {
            const estado = enviando[lead.id];
            return (
              <div key={lead.id} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <ScoreBadge scoring={lead.scoring} />
                      <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{lead.nombre || "Anonimo"}</span>
                      <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{CANAL_LABEL[lead.canal_origen ?? ""] || lead.canal_origen || "-"}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      {lead.telefono && <span>{lead.telefono} - </span>}
                      {lead.email && <span>{lead.email} - </span>}
                      Alta {fmtDate(lead.created_at)}
                    </div>
                    {lead.historial_resumen && <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "#9ca3af", lineHeight: 1.5 }}>{lead.historial_resumen}</p>}
                  </div>

                  <div style={{ flexShrink: 0 }}>
                    {estado === "ok" ? (
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "#059669", padding: "7px 14px", borderRadius: 7, background: "#d1fae5", display: "inline-block" }}>
                        Seguimiento enviado
                      </span>
                    ) : estado === "error" ? (
                      <button onClick={() => reenganchar(lead)} style={{ ...btnGhost, color: "#b91c1c", border: "1px solid #fecaca", background: "#fff1f2" }}>
                        Error - Reintentar
                      </button>
                    ) : (
                      <button
                        onClick={() => reenganchar(lead)}
                        disabled={estado === "loading"}
                        aria-busy={estado === "loading"}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 7,
                          border: "none",
                          background: "#2563eb",
                          color: "white",
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: estado === "loading" ? "default" : "pointer",
                          fontFamily: "inherit",
                          opacity: estado === "loading" ? 0.6 : 1,
                        }}
                      >
                        {estado === "loading" ? "Enviando..." : "Reenganchar"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const btnGhost: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 7,
  border: "1px solid #e5e7eb",
  background: "white",
  color: "#374151",
  fontWeight: 500,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};
