"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type DemoMode = "chat" | "voice";
type CallState = "idle" | "ringing" | "connected" | "ended";

type Message = {
  role: "user" | "assistant";
  text: string;
  time: string;
};

const CALL_MAX_SECONDS = 50;

const VALERIA_CALL_GREETING =
  "Hola, Clínica Estética Luna, le atiende Valeria. Tenemos disponibilidad esta semana. ¿Le puedo ayudar a reservar una cita o tiene alguna consulta?";

const VALERIA_CHAT_GREETING: Message = {
  role: "assistant",
  text: "¡Hola! Soy Valeria, de Clínica Estética Luna 👋 Tenemos disponibilidad mañana a las 10:30, 12:00 y 17:00. ¿Te gustaría reservar una cita o tienes alguna duda sobre nuestros tratamientos?",
  time: "",
};

function getNow() {
  return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export default function AgentDemoSandbox() {
  const [mode, setMode] = useState<DemoMode>("chat");
  const [messages, setMessages] = useState<Message[]>([{ ...VALERIA_CHAT_GREETING, time: getNow() }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);

  const [callState, setCallState] = useState<CallState>("idle");
  const [callSeconds, setCallSeconds] = useState(0);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [callStatus, setCallStatus] = useState("");

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ringingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callActiveRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(Boolean(SR));
    return () => {
      ringingTimerRef.current && clearTimeout(ringingTimerRef.current);
      callTimerRef.current && clearInterval(callTimerRef.current);
      stopAll();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 1) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const stopAll = () => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
  };

  // ── TTS ─────────────────────────────────────────────────────────────────
  const speakTTS = useCallback(async (text: string, onDone?: () => void) => {
    if (!callActiveRef.current) return;
    stopAll();
    try {
      setTtsPlaying(true);
      setCallStatus("Valeria hablando...");
      const res = await fetch("/api/demo/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok || !callActiveRef.current) { setTtsPlaying(false); if (callActiveRef.current) onDone?.(); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setTtsPlaying(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
        if (callActiveRef.current) onDone?.();
      };
      audio.onerror = () => {
        setTtsPlaying(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
        if (callActiveRef.current) onDone?.();
      };
      await audio.play().catch(() => { setTtsPlaying(false); if (callActiveRef.current) onDone?.(); });
    } catch {
      setTtsPlaying(false);
      if (callActiveRef.current) onDone?.();
    }
  }, []);

  // ── STT ─────────────────────────────────────────────────────────────────
  const startListening = () => {
    if (!callActiveRef.current || ttsPlaying) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript?.trim() || "";
      recognitionRef.current = null;
      setIsListening(false);
      if (!transcript || !callActiveRef.current) return;
      setCallStatus("Procesando...");
      void sendVoiceMessage(transcript);
    };

    recognition.onerror = (e: any) => {
      recognitionRef.current = null;
      setIsListening(false);
      if (!callActiveRef.current) return;
      if (e.error === "no-speech") {
        setCallStatus("No te he escuchado, habla cuando quieras...");
        setTimeout(() => { if (callActiveRef.current) startListening(); }, 1500);
      } else {
        setCallStatus("Error de micrófono — " + e.error);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    setCallStatus("Escuchándote...");
    try { recognition.start(); } catch { setIsListening(false); }
  };

  // ── Chat API ─────────────────────────────────────────────────────────────
  const sendChatMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setMessages((prev) => [...prev, { role: "user", text: trimmed, time: getNow() }]);
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/demo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          conversationId,
          history: messages.slice(-8).map((m) => ({ role: m.role, content: m.text })),
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
      const data = await res.json();
      setConversationId(data?.conversationId || null);
      setMessages((prev) => [...prev, { role: "assistant", text: data?.reply || "Sin respuesta.", time: getNow() }]);
    } catch (e: any) {
      setError(e?.message || "Error al conectar.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  // Voice message — API → TTS → listen loop
  const sendVoiceMessage = async (text: string) => {
    if (!callActiveRef.current) return;
    setMessages((prev) => [...prev, { role: "user", text, time: getNow() }]);
    setLoading(true);
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
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const reply = data?.reply || "Sin respuesta.";
      setConversationId(data?.conversationId || null);
      setMessages((prev) => [...prev, { role: "assistant", text: reply, time: getNow() }]);
      setLoading(false);
      speakTTS(reply, () => { if (callActiveRef.current) startListening(); });
    } catch {
      setLoading(false);
      if (callActiveRef.current) {
        setCallStatus("Error, volviendo a escuchar...");
        setTimeout(() => { if (callActiveRef.current) startListening(); }, 1200);
      }
    }
  };

  // ── Call flow ─────────────────────────────────────────────────────────────
  const hangUp = useCallback(() => {
    callActiveRef.current = false;
    ringingTimerRef.current && clearTimeout(ringingTimerRef.current);
    callTimerRef.current && clearInterval(callTimerRef.current);
    stopAll();
    setCallState("ended");
    setIsListening(false);
    setTtsPlaying(false);
    setCallStatus("Llamada finalizada");
    setLoading(false);
  }, []);

  const beginConnected = () => {
    callActiveRef.current = true;
    setCallState("connected");
    setCallSeconds(0);
    setMessages([]);
    setConversationId(null);
    setError("");

    callTimerRef.current = setInterval(() => {
      setCallSeconds((s) => {
        if (s + 1 >= CALL_MAX_SECONDS) { hangUp(); return s; }
        return s + 1;
      });
    }, 1000);

    const greeting: Message = { role: "assistant", text: VALERIA_CALL_GREETING, time: getNow() };
    setMessages([greeting]);
    speakTTS(VALERIA_CALL_GREETING, () => { if (callActiveRef.current) startListening(); });
  };

  const initiateCall = () => {
    if (callState === "ringing" || callState === "connected") return;
    callActiveRef.current = false;
    setCallState("ringing");
    setCallStatus("");
    setError("");
    // Valeria auto-answers after 2.5s
    ringingTimerRef.current = setTimeout(() => beginConnected(), 2500);
  };

  const resetCall = () => {
    hangUp();
    setTimeout(() => {
      callActiveRef.current = false;
      setCallState("idle");
      setCallStatus("");
      setMessages([]);
      setError("");
    }, 200);
  };

  const switchMode = (m: DemoMode) => {
    hangUp();
    setTimeout(() => {
      callActiveRef.current = false;
      setMode(m);
      setCallState("idle");
      setCallStatus("");
      setConversationId(null);
      setError("");
      setInput("");
      setLoading(false);
      if (m === "chat") {
        setMessages([{ ...VALERIA_CHAT_GREETING, time: getNow() }]);
      } else {
        setMessages([]);
      }
    }, 200);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section style={{
      display: "flex",
      gap: 48,
      alignItems: "flex-start",
      flexWrap: "wrap",
      justifyContent: "center",
    }}>

      {/* Phone + toggle wrapper — always centered */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>

        {/* Mode toggle */}
        <div style={{
          display: "flex",
          background: "#f3f4f6",
          borderRadius: 12,
          padding: 4,
          gap: 4,
          width: 300,
          maxWidth: "calc(100vw - 48px)",
          boxSizing: "border-box",
        }}>
          {(["chat", "voice"] as DemoMode[]).map((m) => (
            <button key={m} type="button" onClick={() => switchMode(m)} style={{
              flex: 1, padding: "8px 0", borderRadius: 9, border: "none",
              background: mode === m ? "white" : "transparent",
              color: mode === m ? "#111827" : "#6b7280",
              fontWeight: mode === m ? 700 : 500,
              fontSize: 13.5, cursor: "pointer",
              boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.15s",
            }}>
              {m === "chat" ? "💬 Chat" : "📞 Llamada"}
            </button>
          ))}
        </div>

        {/* Phone shell */}
        <div style={{
          width: 300,
          maxWidth: "calc(100vw - 48px)",
          borderRadius: 36,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.12)",
          background: mode === "chat" ? "#ECE5DD" : "#1C1C1E",
          border: "8px solid #1a1a1a",
          position: "relative",
          boxSizing: "border-box",
        }}>
          {/* Notch */}
          <div style={{
            position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
            width: 100, height: 22, background: "#1a1a1a", borderRadius: "0 0 16px 16px", zIndex: 10,
          }} />

          {/* ── CHAT ─────────────────────────────────────────────────── */}
          {mode === "chat" && (
            <>
              <div style={{ background: "#075E54", padding: "26px 12px 10px", display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 17, flexShrink: 0,
                }}>👩‍⚕️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 13.5, lineHeight: 1.2 }}>Valeria · Clínica Luna</div>
                  <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>{loading ? "escribiendo..." : "en línea"}</div>
                </div>
                {messages.length > 1 && (
                  <button type="button" onClick={() => {
                    setMessages([{ ...VALERIA_CHAT_GREETING, time: getNow() }]);
                    setConversationId(null); setError("");
                  }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 16, padding: 4 }}>↺</button>
                )}
              </div>

              <div style={{ height: 340, overflowY: "auto", padding: "10px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 1 }}>
                    <div style={{
                      maxWidth: "82%",
                      background: msg.role === "user" ? "#DCF8C6" : "white",
                      borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      padding: "7px 9px",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                      fontSize: 13, color: "#111", lineHeight: 1.45, wordBreak: "break-word",
                    }}>
                      {msg.text}
                      <div style={{ fontSize: 10, color: "#9ca3af", textAlign: "right", marginTop: 2 }}>{msg.time}</div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div style={{ background: "white", borderRadius: "12px 12px 12px 2px", padding: "10px 13px", boxShadow: "0 1px 2px rgba(0,0,0,0.08)", display: "flex", gap: 4, alignItems: "center" }}>
                      {[0, 1, 2].map((i) => (
                        <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#9ca3af", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div style={{ background: "#F0F0F0", padding: "6px 8px", display: "flex", gap: 6, alignItems: "flex-end" }}>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      const msg = input; setInput(""); void sendChatMessage(msg);
                    }
                  }}
                  placeholder="Escribe como paciente..."
                  disabled={loading}
                  rows={1}
                  style={{
                    flex: 1, border: "none", borderRadius: 20, padding: "8px 11px",
                    fontSize: 13, resize: "none", outline: "none", fontFamily: "inherit",
                    background: "white", maxHeight: 70, overflowY: "auto",
                  }}
                />
                <button type="button"
                  onClick={() => { const msg = input; setInput(""); void sendChatMessage(msg); }}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                    background: !input.trim() || loading ? "#ccc" : "#25D366",
                    border: "none", cursor: !input.trim() || loading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                    <path d="M2 21L23 12 2 3v7l15 2-15 2v7z" />
                  </svg>
                </button>
              </div>
            </>
          )}

          {/* ── VOICE/CALL ────────────────────────────────────────────── */}
          {mode === "voice" && (
            <div style={{
              minHeight: 460,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "36px 20px 28px",
            }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                {/* Avatar */}
                <div style={{
                  width: 84, height: 84, borderRadius: "50%",
                  background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 36,
                  boxShadow: callState === "connected"
                    ? (isListening
                      ? "0 0 0 8px rgba(52,211,153,0.3), 0 0 0 18px rgba(52,211,153,0.1)"
                      : ttsPlaying
                      ? "0 0 0 8px rgba(167,139,250,0.25), 0 0 0 18px rgba(167,139,250,0.08)"
                      : "none")
                    : callState === "ringing"
                    ? "0 0 0 8px rgba(37,211,102,0.2), 0 0 0 18px rgba(37,211,102,0.08)"
                    : "none",
                  transition: "box-shadow 0.4s",
                  animation: callState === "ringing" ? "ring-pulse 1s ease-in-out infinite" : "none",
                }}>👩‍⚕️</div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 18 }}>Valeria</div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 3 }}>Clínica Estética Luna</div>
                </div>

                {/* Status */}
                <div style={{
                  fontSize: 22, fontVariantNumeric: "tabular-nums", fontWeight: 600, letterSpacing: 1,
                  color: callState === "connected" ? "#34D399" : callState === "ringing" ? "#FCD34D" : "rgba(255,255,255,0.35)",
                  minHeight: 30, textAlign: "center",
                }}>
                  {callState === "idle" && "—"}
                  {callState === "ringing" && "Llamando..."}
                  {callState === "connected" && formatTime(callSeconds)}
                  {callState === "ended" && "Llamada finalizada"}
                </div>

                {/* Progress bar */}
                {callState === "connected" && (
                  <div style={{ width: 180, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${(callSeconds / CALL_MAX_SECONDS) * 100}%`,
                      background: callSeconds > 40 ? "#EF4444" : "#34D399",
                      transition: "width 1s linear, background 0.3s",
                    }} />
                  </div>
                )}

                {/* Call status line */}
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textAlign: "center", minHeight: 18 }}>
                  {callState === "ringing" && "Valeria va a coger en un momento..."}
                  {callState === "connected" && callStatus}
                </div>

                {/* Last message preview */}
                {callState === "connected" && messages.length > 0 && (
                  <div style={{
                    background: "rgba(255,255,255,0.06)", borderRadius: 10,
                    padding: "6px 12px", fontSize: 11.5,
                    color: "rgba(255,255,255,0.5)",
                    maxWidth: 230, textAlign: "center", lineHeight: 1.4,
                    maxHeight: 55, overflowY: "auto",
                  }}>
                    {messages[messages.length - 1].text}
                  </div>
                )}

                {!voiceSupported && (
                  <p style={{ color: "#FCA5A5", fontSize: 11, textAlign: "center", maxWidth: 210, lineHeight: 1.5 }}>
                    Tu navegador no soporta micrófono. Prueba Chrome o Edge.
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                {/* IDLE / ENDED — big green call button */}
                {(callState === "idle" || callState === "ended") && (
                  <>
                    <button type="button" onClick={initiateCall} style={{
                      width: 68, height: 68, borderRadius: "50%",
                      background: "#25D366", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 4px 16px rgba(37,211,102,0.45)",
                    }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
                        <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                      </svg>
                    </button>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
                      {callState === "ended" ? "Volver a llamar" : "Llamar a Clínica Luna"}
                    </span>
                  </>
                )}

                {/* RINGING — only hang up option (user is the caller) */}
                {callState === "ringing" && (
                  <>
                    <button type="button" onClick={resetCall} style={{
                      width: 64, height: 64, borderRadius: "50%",
                      background: "#EF4444", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 4px 16px rgba(239,68,68,0.4)",
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style={{ transform: "rotate(135deg)" }}>
                        <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                      </svg>
                    </button>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>Cancelar</span>
                  </>
                )}

                {/* CONNECTED — hang up */}
                {callState === "connected" && (
                  <>
                    <button type="button" onClick={hangUp} style={{
                      width: 64, height: 64, borderRadius: "50%",
                      background: "#EF4444", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 4px 16px rgba(239,68,68,0.4)",
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style={{ transform: "rotate(135deg)" }}>
                        <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                      </svg>
                    </button>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>Colgar</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p style={{ color: "#EF4444", fontSize: 12, textAlign: "center", maxWidth: 280, lineHeight: 1.4 }}>{error}</p>
        )}
      </div>

      {/* Copy side */}
      <div style={{ flex: 1, minWidth: 240, maxWidth: 440, paddingTop: 8 }}>
        <p style={{
          display: "inline-block", background: "#eff6ff", color: "#2563eb",
          fontWeight: 700, fontSize: 12, borderRadius: 6, padding: "3px 10px",
          marginBottom: 16, letterSpacing: 0.5, textTransform: "uppercase",
        }}>
          Demo interactiva
        </p>
        <h3 style={{
          fontSize: "clamp(20px, 3vw, 27px)", fontWeight: 800, color: "#111827",
          lineHeight: 1.2, marginBottom: 14,
        }}>
          Habla o escribe con Valeria, tu recepcionista IA
        </h3>
        <p style={{ fontSize: 15, color: "#4b5563", lineHeight: 1.7, marginBottom: 18 }}>
          En el <strong>chat</strong>, Valeria arranca la conversación y te orienta hacia una cita. En la <strong>llamada</strong>, ella descuelga automáticamente — habla con normalidad, ella te escucha y responde con voz IA real.
        </p>
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 9 }}>
          {[
            "Valeria arranca la conversación sola, sin que tú preguntes",
            "Llamada continua: hablas → responde → escucha → repite",
            "Voz real de IA (OpenAI TTS), no la del navegador",
            "Gestiona citas, precios y horarios con contexto real",
          ].map((item) => (
            <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 14, color: "#374151" }}>
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
        @keyframes ring-pulse {
          0%, 100% { box-shadow: 0 0 0 8px rgba(37,211,102,0.2), 0 0 0 18px rgba(37,211,102,0.08); }
          50% { box-shadow: 0 0 0 12px rgba(37,211,102,0.3), 0 0 0 26px rgba(37,211,102,0.1); }
        }
      `}</style>
    </section>
  );
}
