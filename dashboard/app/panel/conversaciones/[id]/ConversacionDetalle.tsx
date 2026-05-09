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
  role?: string;
  content?: unknown;
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

type MensajeVisible = {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  from_human?: boolean;
};

export default function ConversacionDetalle({
  conv: initialConv,
  paciente,
  clinic_id,
  backHref = "/panel/conversaciones",
}: {
  conv: Conv;
  paciente: Paciente | null;
  clinic_id: string;
  backHref?: string;
}) {
  const [conv, setConv] = useState<Conv>(initialConv);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [resumen, setResumen] = useState<string | null>(null);
  const [cargandoResumen, setCargandoResumen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const mensajesVisibles = normalizarMensajes(conv.mensajes);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajesVisibles.length]);

  const estado = ESTADO_BADGE[conv.estado] || ESTADO_BADGE.activa;

  const enviarRespuesta = async () => {
    const msg = texto.trim();
    if (!msg || enviando) return;
    setTexto("");
    setEnviando(true);
    setError("");
    try {
      const res = await fetch(`/api/clinicas/${clinic_id}/conversaciones/${conv.id}/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: msg }),
      });
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

  const generarResumen = async () => {
    if (cargandoResumen || mensajesVisibles.length === 0) return;
    setCargandoResumen(true);
    setResumen(null);
    try {
      const res = await fetch("/api/resumen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensajes: mensajesVisibles }),
      });
      const data = await res.json();
      setResumen(data.resumen || data.error || "No se pudo generar el resumen.");
    } catch {
      setResumen("Error al conectar con el servicio de resumen.");
    } finally {
      setCargandoResumen(false);
    }
  };

  const resolverConversacion = async () => {
    setError("");
    const res = await fetch(`/api/clinicas/${clinic_id}/conversaciones/${conv.id}/resolver`, {
      method: "PATCH",
    });
    if (res.ok) {
      setConv((prev) => ({ ...prev, estado: "resuelta" }));
      return;
    }
    setError("No se pudo marcar la conversacion como resuelta.");
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarRespuesta();
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px minmax(0, 1fr)", gap: 18, minHeight: "calc(100vh - 130px)" }}>
      <aside style={{
        background: "#ffffff",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{ padding: "16px 16px 14px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Paciente</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{paciente?.nombre || "Desconocido"}</div>
          {paciente?.telefono && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{paciente.telefono}</div>}
          {paciente?.email && <div style={{ fontSize: 12, color: "#9ca3af" }}>{paciente.email}</div>}
        </div>

        <div style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}>
          <Row label="Canal" value={CANAL_LABEL[conv.canal || ""] || conv.canal || "-"} />
          <Row label="Estado lead" value={paciente?.estado_lead || "-"} />
          <Row label="Origen" value={paciente?.canal_origen || "-"} />
          <Row label="Iniciada" value={fmtDate(conv.created_at)} />
          <Row label="Ultima act." value={fmtDate(conv.updated_at)} />
        </div>

        {paciente?.historial_resumen && (
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Resumen</div>
            <p style={{ fontSize: 12, color: "#374151", margin: 0, lineHeight: 1.6 }}>{paciente.historial_resumen}</p>
          </div>
        )}

        <div style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Estado conversacion</div>
          <span style={{
            display: "inline-block",
            fontSize: 11,
            background: estado.bg,
            color: estado.color,
            borderRadius: 10,
            padding: "3px 10px",
            fontWeight: 600,
          }}>{estado.label}</span>
          {conv.estado !== "resuelta" && (
            <button onClick={resolverConversacion} style={{
              display: "block",
              marginTop: 10,
              width: "100%",
              fontSize: 12,
              padding: "8px 12px",
              borderRadius: 7,
              cursor: "pointer",
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#374151",
            }}>
              Marcar como resuelta
            </button>
          )}
        </div>

        {/* Resumen con IA */}
        <div style={{ padding: "14px 16px" }}>
          <button
            onClick={generarResumen}
            disabled={cargandoResumen || mensajesVisibles.length === 0}
            style={{
              width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              fontSize: 12.5, fontWeight: 600,
              padding: "9px 12px", borderRadius: 8,
              cursor: cargandoResumen || mensajesVisibles.length === 0 ? "not-allowed" : "pointer",
              opacity: mensajesVisibles.length === 0 ? 0.5 : 1,
              border: "1px solid #e0e7ff",
              background: "#f5f3ff",
              color: "#6d28d9",
              fontFamily: "inherit",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1.5L7.8 4.5H10.5L8.3 6.3L9.1 9.5L6.5 7.8L3.9 9.5L4.7 6.3L2.5 4.5H5.2L6.5 1.5Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
            </svg>
            {cargandoResumen ? "Generando…" : "Resumen con IA"}
          </button>

          {resumen && (
            <div style={{
              marginTop: 10,
              padding: "10px 12px",
              background: "#faf5ff",
              border: "1px solid #e9d5ff",
              borderRadius: 8,
              fontSize: 12,
              color: "#374151",
              lineHeight: 1.65,
            }}>
              {resumen}
            </div>
          )}
        </div>
      </aside>

      <div style={{ display: "flex", flexDirection: "column", background: "#ffffff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <div style={{
          padding: "14px 18px",
          borderBottom: "1px solid #f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <a href={backHref} style={{ fontSize: 12, color: "#6b7280", textDecoration: "none", marginRight: 12 }}>Volver</a>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
              Conversacion - {CANAL_LABEL[conv.canal || ""] || conv.canal || "-"}
            </span>
          </div>
          {conv.estado === "esperando_humano" && (
            <span style={{
              fontSize: 12,
              background: "#fef9c3",
              color: "#854d0e",
              borderRadius: 10,
              padding: "3px 10px",
              fontWeight: 600,
            }}>
              Esperando respuesta humana
            </span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {mensajesVisibles.length === 0 && (
            <div style={{ textAlign: "center", color: "#9ca3af", marginTop: 60, fontSize: 13 }}>
              Sin mensajes legibles en esta conversacion
            </div>
          )}
          {mensajesVisibles.map((m, i) => (
            <div key={`${i}-${m.timestamp || ""}`} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 8 }}>
              {m.role === "assistant" && (
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  flexShrink: 0,
                  alignSelf: "flex-end",
                  background: m.from_human ? "#14532d" : "#111827",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: "#ffffff",
                  fontWeight: 700,
                }}>
                  {m.from_human ? "H" : "IA"}
                </div>
              )}
              <div style={{
                maxWidth: "74%",
                background: m.role === "user" ? "#111827" : (m.from_human ? "#f0fdf4" : "#f3f4f6"),
                color: m.role === "user" ? "#ffffff" : "#111827",
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                padding: "10px 13px",
                fontSize: 14,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                border: m.from_human ? "1px solid #86efac" : "none",
                boxSizing: "border-box",
              }}>
                {m.from_human && (
                  <div style={{ fontSize: 10, color: "#166534", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Humano
                  </div>
                )}
                {m.content}
                {m.timestamp && (
                  <div style={{ fontSize: 10, color: m.role === "user" ? "rgba(255,255,255,0.56)" : "#9ca3af", marginTop: 4, textAlign: "right" }}>
                    {new Date(m.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {conv.estado !== "resuelta" && (
          <div style={{ borderTop: "1px solid #f3f4f6", padding: "13px 18px" }}>
            {error && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 8 }}>{error}</div>}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4, fontWeight: 500 }}>Responder como humano</div>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={onKey}
                  disabled={enviando}
                  placeholder="Escribe una respuesta manual... (Enter para enviar, Shift+Enter nueva linea)"
                  rows={2}
                  style={{
                    width: "100%",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    padding: "9px 11px",
                    fontSize: 14,
                    resize: "none",
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                  onInput={(e) => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = "auto";
                    t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
                  }}
                />
              </div>
              <button
                onClick={enviarRespuesta}
                disabled={!texto.trim() || enviando}
                style={{
                  background: "#111827",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 18px",
                  fontSize: 14,
                  cursor: (!texto.trim() || enviando) ? "not-allowed" : "pointer",
                  opacity: (!texto.trim() || enviando) ? 0.5 : 1,
                  flexShrink: 0,
                  marginBottom: 2,
                }}
              >
                {enviando ? "Enviando..." : "Enviar"}
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
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 12 }}>
      <span style={{ fontSize: 12, color: "#9ca3af" }}>{label}</span>
      <span style={{ fontSize: 12, color: "#374151", fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function fmtDate(iso: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function normalizarMensajes(mensajes: Mensaje[]): MensajeVisible[] {
  return mensajes.flatMap((m) => {
    const role = m.role;
    if (role !== "user" && role !== "assistant") return [];

    if (typeof m.content !== "string") return [];
    const content = m.content.trim();
    if (!content || ["null", "undefined", "none"].includes(content.toLowerCase())) return [];

    if (role === "assistant" && !m.from_human && parecePayloadTecnico(content)) return [];

    return [{ role, content, timestamp: m.timestamp, from_human: m.from_human }];
  });
}

function parecePayloadTecnico(texto: string): boolean {
  const trimmed = texto.trim();
  const pareceJson = (trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"));
  if (!pareceJson) return false;

  try {
    const data = JSON.parse(trimmed);
    return !!data && typeof data === "object";
  } catch {
    return false;
  }
}
