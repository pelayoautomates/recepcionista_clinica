"use client";
import { useState, useRef, useEffect } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  clinicId: string;
  agenteName: string;
}

export default function TestAgente({ clinicId, agenteName }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError("");
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/clinicas/${clinicId}/test-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: text, conversacion_id: convId }),
      });
      if (!res.ok) throw new Error("Error del servidor");
      const data = await res.json();
      setConvId(data.conversacion_id);
      setMessages(prev => [...prev, { role: "assistant", content: data.respuesta }]);
    } catch {
      setError("Error al conectar con el agente. Comprueba que el backend está activo.");
      setMessages(prev => prev.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setMessages([]);
    setConvId(null);
    setInput("");
    setError("");
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: "#111827" }}>
            Probar agente
          </h2>
          <p style={{ margin: 0, fontSize: 13.5, color: "#6b7280" }}>
            Simula una conversación real con {agenteName}. No cuenta para el límite de minutos.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={reset}
            style={{
              padding: "7px 14px", fontSize: 12.5, fontWeight: 600,
              color: "#6b7280", background: "#f3f4f6",
              border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer",
            }}
          >
            Nueva conversación
          </button>
        )}
      </div>

      {/* Test mode banner */}
      <div style={{
        background: "#fef3c7", border: "1px solid #fde68a",
        borderRadius: 10, padding: "10px 16px", marginBottom: 16,
        fontSize: 12.5, color: "#92400e",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span>🧪</span>
        <span>
          <strong>Modo test.</strong> La conversación aparece en /conversaciones con canal &quot;test&quot;.
          Las citas que el agente intente crear son reales — cancélalas si no las necesitas.
        </span>
      </div>

      {/* Chat window */}
      <div style={{
        background: "white", border: "1px solid #e5e7eb", borderRadius: 14,
        height: 400, display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>
          {messages.length === 0 ? (
            <div style={{
              height: "100%", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              color: "#9ca3af", fontSize: 13, textAlign: "center", gap: 10,
            }}>
              <div style={{ fontSize: 36 }}>💬</div>
              <div>
                <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#6b7280" }}>
                  Escribe tu primer mensaje
                </p>
                <p style={{ margin: 0 }}>
                  Prueba: &quot;Hola, quiero pedir cita&quot; o &quot;¿Qué servicios tenéis?&quot;
                </p>
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: 10,
                }}
              >
                {m.role === "assistant" && (
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, color: "white", fontWeight: 700,
                    flexShrink: 0, marginRight: 8, marginTop: 2,
                  }}>
                    {(agenteName?.[0] || "A").toUpperCase()}
                  </div>
                )}
                <div style={{
                  maxWidth: "75%",
                  background: m.role === "user" ? "#2563eb" : "#f3f4f6",
                  color: m.role === "user" ? "white" : "#111827",
                  borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  padding: "10px 14px",
                  fontSize: 13.5,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                }}>
                  {m.content}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, color: "white", fontWeight: 700, flexShrink: 0,
              }}>
                {(agenteName?.[0] || "A").toUpperCase()}
              </div>
              <div style={{
                background: "#f3f4f6", borderRadius: "18px 18px 18px 4px",
                padding: "12px 16px", display: "flex", gap: 5, alignItems: "center",
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: "50%", background: "#9ca3af",
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "8px 16px", background: "#fef2f2",
            borderTop: "1px solid #fca5a5", fontSize: 12.5, color: "#991b1b",
          }}>
            {error}
          </div>
        )}

        {/* Input */}
        <div style={{
          borderTop: "1px solid #f3f4f6", padding: "12px 16px",
          display: "flex", gap: 10, alignItems: "flex-end",
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Escribe un mensaje… (Enter para enviar)"
            rows={1}
            style={{
              flex: 1, padding: "9px 13px",
              border: "1px solid #e5e7eb", borderRadius: 10,
              fontSize: 13.5, color: "#111827", resize: "none",
              fontFamily: "inherit", outline: "none",
              maxHeight: 100, overflowY: "auto",
            }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              width: 40, height: 40, borderRadius: 10, border: "none",
              background: loading || !input.trim() ? "#e5e7eb" : "linear-gradient(135deg, #2563eb, #4f46e5)",
              color: "white", cursor: loading || !input.trim() ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "background 0.15s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 8L2 2L5 8L2 14L14 8Z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      <p style={{ marginTop: 10, fontSize: 12, color: "#9ca3af" }}>
        Atajos: <kbd style={{ background: "#f3f4f6", padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>Enter</kbd> enviar ·{" "}
        <kbd style={{ background: "#f3f4f6", padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>Shift+Enter</kbd> salto de línea
      </p>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
