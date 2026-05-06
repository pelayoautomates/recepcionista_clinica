"use client";
import { useState, useRef, useEffect } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

type Mensaje = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatTestPage() {
  const [clinicas, setClinicas] = useState<any[]>([]);
  const [clinicaId, setClinicaId] = useState("");
  const [conversacionId, setConversacionId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${BACKEND}/admin/clinicas`)
      .then(r => r.json())
      .then(data => {
        setClinicas(data);
        if (data.length === 1) setClinicaId(data[0].id);
      })
      .catch(() => setError("No se puede conectar con el backend"));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, loading]);

  const resetChat = () => {
    setMensajes([]);
    setConversacionId(null);
    setInput("");
    setError("");
  };

  const enviar = async () => {
    if (!input.trim() || !clinicaId || loading) return;
    const texto = input.trim();
    setInput("");
    setMensajes(m => [...m, { role: "user", content: texto }]);
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${BACKEND}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinic_id: clinicaId,
          conversacion_id: conversacionId,
          mensaje: texto,
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setConversacionId(data.conversacion_id);
      setMensajes(m => [...m, { role: "assistant", content: data.respuesta }]);
    } catch {
      setError("Error al enviar el mensaje. ¿Está el backend corriendo?");
      setMensajes(m => m.slice(0, -1));
      setInput(texto);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  const clinicaActual = clinicas.find(c => c.id === clinicaId);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>Probar agente IA</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
            Simula una conversación como si fueras un paciente. Las conversaciones se guardan en Supabase.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={clinicaId}
            onChange={e => { setClinicaId(e.target.value); resetChat(); }}
            style={{
              border: "1px solid #d1d5db", borderRadius: 6, padding: "7px 10px",
              fontSize: 14, background: "white", cursor: "pointer",
            }}
          >
            <option value="">— Selecciona clínica —</option>
            {clinicas.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          {mensajes.length > 0 && (
            <button onClick={resetChat} style={{
              fontSize: 13, padding: "7px 12px", borderRadius: 6, cursor: "pointer",
              border: "1px solid #d1d5db", background: "white", color: "#6b7280",
            }}>
              🔄 Nueva conversación
            </button>
          )}
        </div>
      </div>

      {/* Info de la clínica seleccionada */}
      {clinicaActual && (
        <div style={{
          background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8,
          padding: "10px 16px", marginBottom: 12, fontSize: 13, color: "#0369a1",
          display: "flex", gap: 16,
        }}>
          <span>🏥 <strong>{clinicaActual.nombre}</strong></span>
          <span>📅 Google Cal: {clinicaActual.google_tokens_enc ? "✅ conectado" : "❌ no conectado"}</span>
          <span>📞 WhatsApp: {clinicaActual.whatsapp_number ? "✅ configurado" : "❌ no configurado"}</span>
          {conversacionId && <span style={{ marginLeft: "auto", color: "#64748b" }}>ID: {conversacionId.slice(0, 8)}…</span>}
        </div>
      )}

      {/* Ventana de chat */}
      <div style={{
        background: "white", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        display: "flex", flexDirection: "column", height: "calc(100vh - 280px)", minHeight: 400,
      }}>
        {/* Mensajes */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          {!clinicaId && (
            <div style={{ textAlign: "center", color: "#9ca3af", marginTop: 80 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
              <p style={{ margin: 0 }}>Selecciona una clínica para probar su agente</p>
            </div>
          )}

          {clinicaId && mensajes.length === 0 && !loading && (
            <div style={{ textAlign: "center", color: "#9ca3af", marginTop: 60 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
              <p style={{ margin: "0 0 8px", color: "#374151", fontWeight: 500 }}>
                Agente de {clinicaActual?.nombre}
              </p>
              <p style={{ fontSize: 13, margin: "0 0 20px" }}>Escribe como si fueras un paciente</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {["Hola, quiero pedir una cita", "¿Cuánto cuesta una limpieza?", "¿Tenéis hueco esta semana?"].map(sugerencia => (
                  <button key={sugerencia} onClick={() => { setInput(sugerencia); }} style={{
                    fontSize: 12, padding: "6px 12px", borderRadius: 20, cursor: "pointer",
                    border: "1px solid #e5e7eb", background: "#f9fafb", color: "#374151",
                  }}>
                    {sugerencia}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mensajes.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              {m.role === "assistant" && (
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", background: "#1a1a2e",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, marginRight: 8, flexShrink: 0, alignSelf: "flex-end",
                }}>🤖</div>
              )}
              <div style={{
                maxWidth: "72%",
                background: m.role === "user" ? "#1a1a2e" : "#f3f4f6",
                color: m.role === "user" ? "white" : "#111",
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                padding: "10px 14px", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap",
              }}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: "#1a1a2e",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
              }}>🤖</div>
              <div style={{
                background: "#f3f4f6", borderRadius: "16px 16px 16px 4px",
                padding: "10px 16px", color: "#9ca3af", fontSize: 14,
              }}>
                Escribiendo…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div style={{ padding: "8px 16px", background: "#fee2e2", color: "#991b1b", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ borderTop: "1px solid #e5e7eb", padding: 16, display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            disabled={!clinicaId || loading}
            placeholder={clinicaId ? "Escribe como si fueras un paciente… (Enter para enviar)" : "Selecciona una clínica primero"}
            rows={1}
            style={{
              flex: 1, border: "1px solid #d1d5db", borderRadius: 8,
              padding: "10px 12px", fontSize: 14, resize: "none",
              outline: "none", fontFamily: "inherit", opacity: !clinicaId ? 0.5 : 1,
            }}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={enviar}
            disabled={!clinicaId || !input.trim() || loading}
            style={{
              background: "#1a1a2e", color: "white", border: "none",
              borderRadius: 8, padding: "10px 20px", fontSize: 14,
              cursor: (!clinicaId || !input.trim() || loading) ? "not-allowed" : "pointer",
              opacity: (!clinicaId || !input.trim() || loading) ? 0.5 : 1,
            }}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
