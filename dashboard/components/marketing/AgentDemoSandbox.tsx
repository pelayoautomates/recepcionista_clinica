"use client";

import { useEffect, useRef, useState } from "react";

type DemoMode = "chat" | "voice";
type CallState = "idle" | "ringing" | "connected";

type Message = {
  role: "user" | "assistant";
  text: string;
  time: string;
};

function getNow() {
  return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

const VALERIA_GREETING =
  "Hola, gracias por llamar a Clínica Estética Luna. Le atiende Valeria, ¿en qué puedo ayudarle?";

export default function AgentDemoSandbox() {
  const [mode, setMode] = useState<DemoMode>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Voice/call state
  const [callState, setCallState] = useState<CallState>("idle");
  const [callSeconds, setCallSeconds] = useState(0);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const ringingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(Boolean(SR));
    return () => {
      ringingTimerRef.current && clearTimeout(ringingTimerRef.current);
      callTimerRef.current && clearInterval(callTimerRef.current);
      recognitionRef.current?.stop();
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const formatCallTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // ── TTS ──────────────────────────────────────────────────────────────────
  const speakTTS = async (text: string) => {
    try {
      setTtsPlaying(true);
      const res = await fetch("/api/demo/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setTtsPlaying(false);
        URL.revokeObjectURL(url);
        // After Valeria speaks, start listening again in call mode
        if (callState === "connected") startListening();
      };
      audio.onerror = () => { setTtsPlaying(false); URL.revokeObjectURL(url); };
      await audio.play();
    } catch {
      setTtsPlaying(false);
    }
  };

  // ── Chat API ─────────────────────────────────────────────────────────────
  const sendMessage = async (rawText: string, isVoice = false) => {
    const text = rawText.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", text, time: getNow() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/demo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId,
          history: messages.slice(-8).map((m) => ({ role: m.role, content: m.text })),
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || `Error ${res.status}`);
      }

      const data = await res.json();
      const reply = data?.reply || "No se ha recibido respuesta del agente.";

      setConversationId(data?.conversationId || null);
      setMessages((prev) => [...prev, { role: "assistant", text: reply, time: getNow() }]);

      if (isVoice || mode === "voice") {
        await speakTTS(reply);
      }
    } catch (e: any) {
      setError(e?.message || "Error al conectar con el agente.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  // ── STT ──────────────────────────────────────────────────────────────────
  const startListening = () => {
    if (ttsPlaying) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || "";
      setVoiceTranscript(transcript);
      setVoiceListening(false);
      void sendMessage(transcript, true);
    };

    recognition.onerror = () => {
      setError("No se pudo capturar audio. Revisa permisos de micrófono.");
      setVoiceListening(false);
    };

    recognition.onend = () => setVoiceListening(false);

    recognitionRef.current = recognition;
    setVoiceTranscript("");
    setVoiceListening(true);
    recognition.start();
  };

  // ── Call flow ─────────────────────────────────────────────────────────────
  const initiateCall = () => {
    if (callState !== "idle") return;
    setCallState("ringing");
    setCallSeconds(0);
    setMessages([]);
    setConversationId(null);
    setError("");

    ringingTimerRef.current = setTimeout(() => {
      acceptCall();
    }, 3000);
  };

  const acceptCall = () => {
    ringingTimerRef.current && clearTimeout(ringingTimerRef.current);
    setCallState("connected");
    callTimerRef.current = setInterval(() => setCallSeconds((s) => s + 1), 1000);

    // Valeria greets
    const greeting: Message = { role: "assistant", text: VALERIA_GREETING, time: getNow() };
    setMessages([greeting]);
    void speakTTS(VALERIA_GREETING);
  };

  const hangUp = () => {
    ringingTimerRef.current && clearTimeout(ringingTimerRef.current);
    callTimerRef.current && clearInterval(callTimerRef.current);
    recognitionRef.current?.stop();
    audioRef.current?.pause();
    setCallState("idle");
    setCallSeconds(0);
    setVoiceListening(false);
    setTtsPlaying(false);
    setVoiceTranscript("");
  };

  const resetChat = () => {
    setMessages([]);
    setConversationId(null);
    setError("");
    setInput("");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section style={{ display: "flex", gap: 48, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* Interactive side */}
      <div style={{ flex: "0 0 340px", maxWidth: "100%" }}>

        {/* Mode toggle */}
        <div style={{
          display: "flex",
          background: "#f3f4f6",
          borderRadius: 12,
          padding: 4,
          marginBottom: 20,
          gap: 4,
        }}>
          {(["chat", "voice"] as DemoMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); hangUp(); resetChat(); }}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 9,
                border: "none",
                background: mode === m ? "white" : "transparent",
                color: mode === m ? "#111827" : "#6b7280",
                fontWeight: mode === m ? 700 : 500,
                fontSize: 13.5,
                cursor: "pointer",
                boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s",
              }}
            >
              {m === "chat" ? "💬 Chat" : "📞 Llamada"}
            </button>
          ))}
        </div>

        {/* Phone shell */}
        <div style={{
          width: 340,
          maxWidth: "100%",
          borderRadius: 36,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.12)",
          background: "#ECE5DD",
          border: "8px solid #1a1a1a",
          position: "relative",
        }}>
          {/* Phone notch */}
          <div style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 120,
            height: 28,
            background: "#1a1a1a",
            borderRadius: "0 0 20px 20px",
            zIndex: 10,
          }} />

          {/* Header */}
          <div style={{
            background: "#075E54",
            padding: "32px 16px 12px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              flexShrink: 0,
            }}>
              👩‍⚕️
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "white", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
                Valeria · Clínica Luna
              </div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11.5 }}>
                {mode === "chat"
                  ? (loading ? "escribiendo..." : "en línea")
                  : callState === "idle" ? "Disponible"
                  : callState === "ringing" ? "Llamando..."
                  : `En llamada · ${formatCallTime(callSeconds)}`}
              </div>
            </div>
            {mode === "chat" && messages.length > 0 && (
              <button
                type="button"
                onClick={resetChat}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 13 }}
              >
                ↺
              </button>
            )}
          </div>

          {/* ── CHAT MODE ────────────────────────────────────────────── */}
          {mode === "chat" && (
            <>
              <div style={{
                height: 380,
                overflowY: "auto",
                padding: "12px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}>
                {messages.length === 0 && (
                  <div style={{
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: 13,
                    padding: "60px 20px",
                    lineHeight: 1.6,
                  }}>
                    Escribe como si fueras un paciente y prueba la respuesta de Valeria.
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} style={{
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                    marginBottom: 2,
                  }}>
                    <div style={{
                      maxWidth: "78%",
                      background: msg.role === "user" ? "#DCF8C6" : "white",
                      borderRadius: msg.role === "user"
                        ? "12px 12px 2px 12px"
                        : "12px 12px 12px 2px",
                      padding: "8px 10px",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                      fontSize: 13.5,
                      color: "#111",
                      lineHeight: 1.45,
                      wordBreak: "break-word",
                    }}>
                      {msg.text}
                      <div style={{ fontSize: 10, color: "#9ca3af", textAlign: "right", marginTop: 3 }}>
                        {msg.time}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div style={{
                      background: "white",
                      borderRadius: "12px 12px 12px 2px",
                      padding: "10px 14px",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                      display: "flex",
                      gap: 4,
                      alignItems: "center",
                    }}>
                      {[0, 1, 2].map((i) => (
                        <div key={i} style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "#9ca3af",
                          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{
                background: "#F0F0F0",
                padding: "8px 10px",
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
              }}>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      const msg = input;
                      setInput("");
                      void sendMessage(msg);
                    }
                  }}
                  placeholder="Escribe como paciente..."
                  disabled={loading}
                  rows={1}
                  style={{
                    flex: 1,
                    border: "none",
                    borderRadius: 20,
                    padding: "9px 14px",
                    fontSize: 13.5,
                    resize: "none",
                    outline: "none",
                    fontFamily: "inherit",
                    background: "white",
                    maxHeight: 80,
                    overflowY: "auto",
                  }}
                />
                <button
                  type="button"
                  onClick={() => { const msg = input; setInput(""); void sendMessage(msg); }}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: !input.trim() || loading ? "#ccc" : "#25D366",
                    border: "none",
                    cursor: !input.trim() || loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "background 0.15s",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M2 21L23 12 2 3v7l15 2-15 2v7z" />
                  </svg>
                </button>
              </div>
            </>
          )}

          {/* ── VOICE/CALL MODE ──────────────────────────────────────── */}
          {mode === "voice" && (
            <div style={{
              minHeight: 460,
              background: "#1C1C1E",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "32px 24px 28px",
            }}>
              {/* Avatar + status */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <div style={{
                  width: 90,
                  height: 90,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 40,
                  boxShadow: callState === "connected"
                    ? "0 0 0 8px rgba(167,139,250,0.2), 0 0 0 16px rgba(167,139,250,0.1)"
                    : "none",
                  transition: "box-shadow 0.4s",
                }}>
                  👩‍⚕️
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 20 }}>Valeria</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>
                    Clínica Estética Luna
                  </div>
                </div>

                <div style={{
                  fontSize: 24,
                  fontVariantNumeric: "tabular-nums",
                  color: callState === "connected" ? "#34D399" : "rgba(255,255,255,0.5)",
                  fontWeight: 600,
                  letterSpacing: 1,
                  minHeight: 32,
                }}>
                  {callState === "idle" && "—"}
                  {callState === "ringing" && "Llamando..."}
                  {callState === "connected" && formatCallTime(callSeconds)}
                </div>

                {callState === "connected" && (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textAlign: "center", minHeight: 18 }}>
                    {ttsPlaying ? "🔊 Valeria hablando..." : voiceListening ? "🎤 Escuchando..." : "Toca el mic para hablar"}
                  </div>
                )}

                {voiceTranscript && callState === "connected" && (
                  <div style={{
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    padding: "6px 12px",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.6)",
                    maxWidth: 240,
                    textAlign: "center",
                  }}>
                    "{voiceTranscript}"
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div>
                {callState === "idle" && (
                  <button
                    type="button"
                    onClick={initiateCall}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      background: "#25D366",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 16px rgba(37,211,102,0.4)",
                    }}
                  >
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
                      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                    </svg>
                  </button>
                )}

                {callState === "ringing" && (
                  <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={hangUp}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: "#EF4444",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 16px rgba(239,68,68,0.4)",
                      }}
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="white" style={{ transform: "rotate(135deg)" }}>
                        <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={acceptCall}
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: "#25D366",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 16px rgba(37,211,102,0.4)",
                      }}
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                        <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                      </svg>
                    </button>
                  </div>
                )}

                {callState === "connected" && (
                  <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={startListening}
                      disabled={ttsPlaying || voiceListening || loading || !voiceSupported}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: voiceListening ? "#a78bfa" : "rgba(255,255,255,0.12)",
                        border: "none",
                        cursor: ttsPlaying || loading || !voiceSupported ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background 0.2s",
                      }}
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93h2c0 3.31 2.69 6 6 6s6-2.69 6-6h2c0 4.08-3.06 7.44-7 7.93V22h-2v-4.07z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={hangUp}
                      style={{
                        width: 68,
                        height: 68,
                        borderRadius: "50%",
                        background: "#EF4444",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 16px rgba(239,68,68,0.4)",
                      }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="white" style={{ transform: "rotate(135deg)" }}>
                        <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p style={{ color: "#EF4444", fontSize: 12.5, marginTop: 10, textAlign: "center" }}>
            {error}
          </p>
        )}
        {!voiceSupported && mode === "voice" && (
          <p style={{ color: "#9ca3af", fontSize: 12, marginTop: 8, textAlign: "center" }}>
            Tu navegador no soporta reconocimiento de voz. Prueba Chrome o Edge.
          </p>
        )}
      </div>

      {/* Copy side */}
      <div style={{ flex: 1, minWidth: 260, paddingTop: 8 }}>
        <p style={{
          display: "inline-block",
          background: "#eff6ff",
          color: "#2563eb",
          fontWeight: 700,
          fontSize: 12,
          borderRadius: 6,
          padding: "3px 10px",
          marginBottom: 16,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}>
          Demo interactiva
        </p>
        <h3 style={{
          fontSize: "clamp(22px, 3vw, 30px)",
          fontWeight: 800,
          color: "#111827",
          lineHeight: 1.2,
          marginBottom: 16,
        }}>
          Habla o escribe con Valeria, tu recepcionista IA
        </h3>
        <p style={{ fontSize: 16, color: "#4b5563", lineHeight: 1.7, marginBottom: 20 }}>
          Valeria está entrenada como recepcionista de Clínica Estética Luna.
          Prueba el chat estilo WhatsApp o simula una llamada real — incluyendo voz con IA.
          Así verán la experiencia tus pacientes desde el primer día.
        </p>
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            "Chat en tiempo real con contexto de la clínica",
            "Llamada simulada con voz IA (OpenAI TTS)",
            "Gestión de citas y preguntas sobre servicios",
            "Rechaza preguntas fuera de contexto",
          ].map((item) => (
            <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14.5, color: "#374151" }}>
              <span style={{ color: "#16a34a", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </section>
  );
}
