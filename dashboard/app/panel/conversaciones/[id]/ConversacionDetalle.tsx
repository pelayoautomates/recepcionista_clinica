"use client";
import { useState, useRef, useEffect } from "react";

const ESTADO_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  activa: { label: "Activa", bg: "#dcfce7", color: "#166534" },
  esperando_humano: { label: "Esperando respuesta humana", bg: "#fef9c3", color: "#854d0e" },
  resuelta: { label: "Resuelta", bg: "#f3f4f6", color: "#6b7280" },
};

const CANAL_LABEL: Record<string, string> = {
  chat_web: "Chat web",
  whatsapp: "WhatsApp",
  voz: "Voz",
};

type Mensaje = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  from_human?: boolean;
};

type Conv = {
  id: string;
  clinic_id: string;
  paciente_id?: string;
  canal?: string;
  mensajes: Mensaje[];
  estado: string;
  created_at: string;
  updated_at: string;
};

type Paciente = {
  id: string;
  nombre?: string;
  telefono?: string;
  email?: string;
  canal_origen?: string;
  estado_lead?: string;
  historial_resumen?: string;
  created_at?: string;
};

export default function ConversacionDetalle({
  conv: initialConv,
  paciente,
  clinic_id,
  backendUrl,
}: {
  conv: Conv;
  paciente: Paciente | null;
  clinic_id: string;
  backendUrl: string;
}) {
  const [conv, setConv] = useState<Conv>(initialConv);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv.mensajes]);

  const estado = ESTADO_BADGE[conv.estado] || ESTADO_BADGE.activa;

  const enviarRespuesta = async () => {
    const msg = texto.trim();
    if (!msg || enviando) return;
    setTexto("");
    setEnviando(true);
    setError("");
    try {
      const res = await fetch(
        `${backendUrl}/admin/clinicas/${clinic_id}/conversaciones/${conv.id}/responder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mensaje: msg }),
        }
      );
      if (!res.ok) throw new Error("Error al enviar");
      const updated = await res.json();
      setConv((prev) => ({ ...prev, mensajes: updated.mensajes, estado: updated.estado }));
    } catch {
      setError("No se pudo enviar el mensaje.");
      setTexto(msg);
    } finally {
      setEnviando(false);
    }
  };

  const resolverConversacion = async () => {
    const res = await fetch(
      `${backendUrl}/admin/clinicas/${clinic_id}/conversaciones/${conv.id}/resolver`,
      { method: "PATCH" }
    );
    if (res.ok) setConv((prev) => ({ ...prev, estado: "resuelta" }));
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarRespuesta();
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20, height: "calc(100vh - 110px)" }}>

      {/* Sidebar — info paciente */}
      <aside style={{
        background: "white", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
        overflow: "auto", display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Paciente</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{paciente?.nombre || "Desconocido"}</div>
          {paciente?.telefono && (
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{paciente.telefono}</div>
          )}
          {paciente?.email && (
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{paciente.email}</div>
          )}
        </div>

        <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6" }}>
          <Row label="Canal" value={CANAL_LABEL[conv.canal || ""] || conv.canal || "—"} />
          <Row label="Estado lead" value={paciente?.estado_lead || "—"} />
          <Row label="Origen" value={paciente?.canal_origen || "—"} />
          <Row label="Iniciada" value={fmtDate(conv.created_at)} />
          <Row label="Última act." value={fmtDate(conv.updated_at)} />
        </div>

        {paciente?.historial_resumen && (
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Resumen</div>
            <p style={{ fontSize: 12, color: "#374151", margin: 0, lineHeight: 1.6 }}>{paciente.historial_resumen}</p>
          </div>
        )}

        <div style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Estado conversación</div>
          <span style={{
            display: "inline-block", fontSize: 11, background: estado.bg, color: estado.color,
            borderRadius: 10, padding: "3px 10px", fontWeight: 600,
          }}>{estado.label}</span>
          {conv.estado !== "resuelta" && (
            <button onClick={resolverConversacion} style={{
              display: "block", marginTop: 10, width: "100%", fontSize: 12,
              padding: "7px 12px", borderRadius: 6, cursor: "pointer",
              border: "1px solid #d1d5db", background: "white", color: "#374151",
            }}>
              Marcar como resuelta
            </button>
          )}
        </div>
      </aside>

      {/* Chat area */}
      <div style={{ display: "flex", flexDirection: "column", background: "white", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.07)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid #f3f4f6",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <a href="/panel/conversaciones" style={{ fontSize: 12, color: "#6b7280", textDecoration: "none", marginRight: 12 }}>← Volver</a>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Conversación — {CANAL_LABEL[conv.canal || ""] || conv.canal || "—"}
            </span>
          </div>
          {conv.estado === "esperando_humano" && (
            <span style={{
              fontSize: 12, background: "#fef9c3", color: "#854d0e",
              borderRadius: 10, padding: "3px 10px", fontWeight: 600,
            }}>
              Esperando respuesta humana
            </span>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {conv.mensajes.length === 0 && (
            <div style={{ textAlign: "center", color: "#9ca3af", marginTop: 60, fontSize: 13 }}>
              Sin mensajes en esta conversación
            </div>
          )}
          {conv.mensajes.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
              {m.role === "assistant" && (
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0, alignSelf: "flex-end",
                  background: m.from_human ? "#166534" : "#1a1a2e",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, color: "white", fontWeight: 700,
                }}>
                  {m.from_human ? "H" : "IA"}
                </div>
              )}
              <div style={{
                maxWidth: "68%",
                background: m.role === "user" ? "#1a1a2e" : (m.from_human ? "#f0fdf4" : "#f3f4f6"),
                color: m.role === "user" ? "white" : "#111827",
                borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                padding: "10px 14px", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap",
                border: m.from_human ? "1px solid #86efac" : "none",
              }}>
                {m.from_human && (
                  <div style={{ fontSize: 10, color: "#166534", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Humano</div>
                )}
                {m.content}
                {m.timestamp && (
                  <div style={{ fontSize: 10, color: m.role === "user" ? "rgba(255,255,255,0.5)" : "#9ca3af", marginTop: 4, textAlign: "right" }}>
                    {new Date(m.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Reply box */}
        {conv.estado !== "resuelta" && (
          <div style={{ borderTop: "1px solid #f3f4f6", padding: "14px 20px" }}>
            {error && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 8 }}>{error}</div>}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4, fontWeight: 500 }}>Responder como humano</div>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={onKey}
                  disabled={enviando}
                  placeholder="Escribe una respuesta manual… (Enter para enviar, Shift+Enter nueva línea)"
                  rows={2}
                  style={{
                    width: "100%", border: "1px solid #d1d5db", borderRadius: 8,
                    padding: "9px 12px", fontSize: 14, resize: "none",
                    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                  }}
                  onInput={(e) => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = "auto";
                    t.style.height = Math.min(t.scrollHeight, 120) + "px";
                  }}
                />
              </div>
              <button
                onClick={enviarRespuesta}
                disabled={!texto.trim() || enviando}
                style={{
                  background: "#166534", color: "white", border: "none",
                  borderRadius: 8, padding: "10px 20px", fontSize: 14,
                  cursor: (!texto.trim() || enviando) ? "not-allowed" : "pointer",
                  opacity: (!texto.trim() || enviando) ? 0.5 : 1,
                  flexShrink: 0, marginBottom: 2,
                }}
              >
                {enviando ? "Enviando…" : "Enviar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: "#9ca3af" }}>{label}</span>
      <span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
