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

const VALERIA_GREETING =
  "Hola, gracias por llamar a Clínica Estética Luna, le atiende Valeria. ¿En qué puedo ayudarle?";

function getNow() {
  return new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export default function AgentDemoSandbox() {
  const [mode, setMode] = useState<DemoMode>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Call state
  const [callState, setCallState] = useState<CallState>("idle");
  const [callSeconds, setCallSeconds] = useState(0);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [callStatus, setCallStatus] = useState(""); // descriptive status line

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ringingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callEndedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(Boolean(SR));
    return () => {
      ringingTimerRef.current && clearTimeout(ringingTimerRef.current);
      callTimerRef.current && clearInterval(callTimerRef.current);
      stopEverything();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const stopEverything = () => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
  };

  // ── Start listening (STT) ────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (callEndedRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || "";
      if (!transcript.trim() || callEndedRef.current) return;
      setIsListening(false);
      setCallStatus("Procesando...");
      void sendVoiceMessage(transcript);
    };

    recognition.onerror = (e: any) => {
      setIsListening(false);
      if (callEndedRef.current) return;
      if (e.error === "no-speech") {
        setCallStatus("No te escuché, vuelve a hablar...");
        // retry after short delay
        setTimeout(() => { if (!callEndedRef.current) startListening(); }, 1000);
      } else {
        setCallStatus("Error de micrófono");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    setCallStatus("Escuchando...");
    recognition.start();
  }, []);

  // ── TTS ─────────────────────────────────────────────────────────────────
  const speakTTS = useCallback(async (text: string, onDone?: () => void) => {
    if (callEndedRef.current) return;
    try {
      setTtsPlaying(true);
      setCallStatus("Valeria hablando...");
      const res = await fetch("/api/demo/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok || callEndedRef.current) { setTtsPlaying(false); onDone?.(); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setTtsPlaying(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
        if (!callEndedRef.current) onDone?.();
      };
      audio.onerror = () => {
        setTtsPlaying(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
        if (!callEndedRef.current) onDone?.();
      };
      await audio.play();
    } catch {
      setTtsPlaying(false);
      if (!callEndedRef.current) onDone?.();
    }
  }, []);

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
      const reply = data?.reply || "Sin respuesta.";
      setConversationId(data?.conversationId || null);
      setMessages((prev) => [...prev, { role: "assistant", text: reply, time: getNow() }]);
    } catch (e: any) {
      setError(e?.message || "Error al conectar.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  // Voice message — sends to API then speaks response then listens again
  const sendVoiceMessage = async (text: string) => {
    if (callEndedRef.current) return;
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
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Error ${res.status}`);
      const data = await res.json();
      const reply = data?.reply || "Sin respuesta.";
      setConversationId(data?.conversationId || null);
      setMessages((prev) => [...prev, { role: "assistant", text: reply, time: getNow() }]);
      setLoading(false);
      // Speak then auto-listen again
      speakTTS(reply, () => { if (!callEndedRef.current) startListening(); });
    } catch (e: any) {
      setLoading(false);
      if (!callEndedRef.current) {
        setCallStatus("Error, volviendo a escuchar...");
        setTimeout(() => { if (!callEndedRef.current) startListening(); }, 1200);
      }
    }
  };

  // ── Call flow ────────────────────────────────────────────────────────────
  const hangUp = useCallback(() => {
    callEndedRef.current = true;
    ringingTimerRef.current && clearTimeout(ringingTimerRef.current);
    callTimerRef.current && clearInterval(callTimerRef.current);
    stopEverything();
    setCallState("ended");
    setIsListening(false);
    setTtsPlaying(false);
    setCallStatus("Llamada finalizada");
    setCallSeconds(0);
  }, []);

  const beginConnected = useCallback(() => {
    callEndedRef.current = false;
    setCallState("connected");
    setCallSeconds(0);
    setCallStatus("Conectando...");
    setMessages([]);
    setConversationId(null);

    // 50s max call timer
    callTimerRef.current = setInterval(() => {
      setCallSeconds((s) => {
        if (s + 1 >= CALL_MAX_SECONDS) {
          hangUp();
          return s;
        }
        return s + 1;
      });
    }, 1000);

    // Greet then start continuous listen loop
    const greeting: Message = { role: "assistant", text: VALERIA_GREETING, time: getNow() };
    setMessages([greeting]);
    speakTTS(VALERIA_GREETING, () => { if (!callEndedRef.current) startListening(); });
  }, [speakTTS, startListening, hangUp]);

  const initiateCall = () => {
    if (callState !== "idle" && callState !== "ended") return;
    setCallState("ringing");
    setError("");
    ringingTimerRef.current = setTimeout(() => beginConnected(), 3000);
  };

  const resetCall = () => {
    hangUp();
    setTimeout(() => {
      callEndedRef.current = false;
      setCallState("idle");
      setCallStatus("");
      setMessages([]);
      setError("");
    }, 300);
  };

  const switchMode = (m: DemoMode) => {
    hangUp();
    setTimeout(() => {
      callEndedRef.current = false;
      setMode(m);
      setCallState("idle");
      setCallStatus("");
      setMessages([]);
      setConversationId(null);
      setError("");
      setInput("");
    }, 300);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <section style={{
      display: "flex",
      gap: 48,
      alignItems: "flex-start",
      flexWrap: "wrap",
      justifyContent: "center",
    }}>

      {/* Phone shell wrapper — centered */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>

        {/* Mode toggle */}
        <div style={{
          display: "flex",
          background: "#f3f4f6",
          borderRadius: 12,
          padding: 4,
          gap: 4,
          width: 320,
          maxWidth: "calc(100vw - 48px)",
        }}>
          {(["chat", "voice"] as DemoMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
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
          width: 320,
          maxWidth: "calc(100vw - 48px)",
          borderRadius: 36,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.12)",
          background: mode === "chat" ? "#ECE5DD" : "#1C1C1E",
          border: "8px solid #1a1a1a",
          position: "relative",
        }}>
          {/* Notch */}
          <div style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 110,
            height: 24,
            background: "#1a1a1a",
            borderRadius: "0 0 18px 18px",
            zIndex: 10,
          }} />

          {/* ── CHAT MODE ─────────────────────────────────────────── */}
          {mode === "chat" && (
            <>
              {/* Header */}
              <div style={{
                background: "#075E54",
                padding: "28px 14px 12px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0,
                }}>👩‍⚕️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                    Valeria · Clínica Luna
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>
                    {loading ? "escribiendo..." : "en línea"}
                  </div>
                </div>
                {messages.length > 0 && (
                  <button type="button" onClick={() => { setMessages([]); setConversationId(null); setError(""); }}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 16, padding: 4 }}>
                    ↺
                  </button>
                )}
              </div>

              {/* Messages */}
              <div style={{ height: 360, overflowY: "auto", padding: "10px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: "center", color: "#6b7280", fontSize: 13, padding: "50px 16px", lineHeight: 1.6 }}>
                    Escribe como si fueras un paciente y prueba la respuesta de Valeria.
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 1 }}>
                    <div style={{
                      maxWidth: "80%",
                      background: msg.role === "user" ? "#DCF8C6" : "white",
                      borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      padding: "7px 9px",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                      fontSize: 13,
                      color: "#111",
                      lineHeight: 1.45,
                      wordBreak: "break-word",
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

              {/* Input */}
              <div style={{ background: "#F0F0F0", padding: "7px 8px", display: "flex", gap: 7, alignItems: "flex-end" }}>
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
                    flex: 1, border: "none", borderRadius: 20, padding: "8px 12px",
                    fontSize: 13, resize: "none", outline: "none", fontFamily: "inherit",
                    background: "white", maxHeight: 72, overflowY: "auto",
                  }}
                />
                <button
                  type="button"
                  onClick={() => { const msg = input; setInput(""); void sendChatMessage(msg); }}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: !input.trim() || loading ? "#ccc" : "#25D366",
                    border: "none", cursor: !input.trim() || loading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M2 21L23 12 2 3v7l15 2-15 2v7z" />
                  </svg>
                </button>
              </div>
            </>
          )}

          {/* ── VOICE/CALL MODE ──────────────────────────────────────── */}
          {mode === "voice" && (
            <div style={{
              minHeight: 480,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "36px 20px 28px",
            }}>
              {/* Avatar */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 88, height: 88, borderRadius: "50%",
                  background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 38,
                  boxShadow: callState === "connected"
                    ? (isListening
                      ? "0 0 0 8px rgba(52,211,153,0.25), 0 0 0 18px rgba(52,211,153,0.1)"
                      : "0 0 0 8px rgba(167,139,250,0.2), 0 0 0 16px rgba(167,139,250,0.08)")
                    : "none",
                  transition: "box-shadow 0.4s",
                }}>
                  👩‍⚕️
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ color: "white", fontWeight: 700, fontSize: 19 }}>Valeria</div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 3 }}>Clínica Estética Luna</div>
                </div>

                {/* Timer */}
                <div style={{
                  fontSize: 26, fontVariantNumeric: "tabular-nums", fontWeight: 600, letterSpacing: 1,
                  color: callState === "connected" ? "#34D399" : "rgba(255,255,255,0.4)",
                  minHeight: 34,
                }}>
                  {callState === "idle" && "—"}
                  {callState === "ringing" && "Llamando..."}
                  {callState === "connected" && formatTime(callSeconds)}
                  {callState === "ended" && "Llamada terminada"}
                </div>

                {/* 50s bar */}
                {callState === "connected" && (
                  <div style={{ width: 200, height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${(callSeconds / CALL_MAX_SECONDS) * 100}%`,
                      background: callSeconds > 40 ? "#EF4444" : "#34D399",
                      transition: "width 1s linear, background 0.3s",
                    }} />
                  </div>
                )}

                {/* Status line */}
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center", minHeight: 18 }}>
                  {callState === "connected" && callStatus}
                </div>

                {/* Last transcript (small) */}
                {callState === "connected" && messages.length > 0 && (
                  <div style={{
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 10,
                    padding: "6px 12px",
                    fontSize: 11.5,
                    color: "rgba(255,255,255,0.5)",
                    maxWidth: 240,
                    textAlign: "center",
                    lineHeight: 1.4,
                    maxHeight: 60,
                    overflowY: "auto",
                  }}>
                    {messages[messages.length - 1].text}
                  </div>
                )}

                {!voiceSupported && (
                  <p style={{ color: "#EF4444", fontSize: 11, textAlign: "center", maxWidth: 220, lineHeight: 1.4 }}>
                    Tu navegador no soporta micrófono. Prueba Chrome o Edge.
                  </p>
                )}
              </div>

              {/* Controls */}
              <div>
                {(callState === "idle" || callState === "ended") && (
                  <button type="button" onClick={initiateCall} style={{
                    width: 70, height: 70, borderRadius: "50%",
                    background: "#25D366", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 16px rgba(37,211,102,0.4)",
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                    </svg>
                  </button>
                )}

                {callState === "ringing" && (
                  <div style={{ display: "flex", gap: 36, alignItems: "center" }}>
                    <div style={{ textAlign: "center" }}>
                      <button type="button" onClick={resetCall} style={{
                        width: 62, height: 62, borderRadius: "50%",
                        background: "#EF4444", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 4px 16px rgba(239,68,68,0.4)",
                        margin: "0 auto 6px",
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style={{ transform: "rotate(135deg)" }}>
                          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                        </svg>
                      </button>
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Rechazar</span>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <button type="button" onClick={beginConnected} style={{
                        width: 62, height: 62, borderRadius: "50%",
                        background: "#25D366", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 4px 16px rgba(37,211,102,0.4)",
                        margin: "0 auto 6px",
                        animation: "pulse-green 1s ease-in-out infinite",
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                        </svg>
                      </button>
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Aceptar</span>
                    </div>
                  </div>
                )}

                {callState === "connected" && (
                  <div style={{ textAlign: "center" }}>
                    <button type="button" onClick={hangUp} style={{
                      width: 66, height: 66, borderRadius: "50%",
                      background: "#EF4444", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 4px 16px rgba(239,68,68,0.4)",
                      margin: "0 auto 8px",
                    }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="white" style={{ transform: "rotate(135deg)" }}>
                        <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                      </svg>
                    </button>
                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>Colgar</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p style={{ color: "#EF4444", fontSize: 12, textAlign: "center", maxWidth: 300 }}>{error}</p>
        )}
      </div>

      {/* Copy side */}
      <div style={{ flex: 1, minWidth: 240, maxWidth: 460, paddingTop: 8 }}>
        <p style={{
          display: "inline-block", background: "#eff6ff", color: "#2563eb",
          fontWeight: 700, fontSize: 12, borderRadius: 6, padding: "3px 10px",
          marginBottom: 16, letterSpacing: 0.5, textTransform: "uppercase",
        }}>
          Demo interactiva
        </p>
        <h3 style={{
          fontSize: "clamp(20px, 3vw, 28px)", fontWeight: 800, color: "#111827",
          lineHeight: 1.2, marginBottom: 14,
        }}>
          Habla o escribe con Valeria, tu recepcionista IA
        </h3>
        <p style={{ fontSize: 15, color: "#4b5563", lineHeight: 1.7, marginBottom: 18 }}>
          Valeria está entrenada como recepcionista de Clínica Estética Luna.
          En la llamada habla con normalidad — ella te escucha, responde con voz IA y vuelve a escucharte automáticamente.
          Máximo 50 segundos de demo.
        </p>
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 9 }}>
          {[
            "Chat estilo WhatsApp en tiempo real",
            "Llamada continua con voz IA (OpenAI TTS)",
            "Escucha automática tras cada respuesta",
            "Gestión de citas, precios y horarios",
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
        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 4px 16px rgba(37,211,102,0.4); }
          50% { box-shadow: 0 4px 28px rgba(37,211,102,0.7); }
        }
      `}</style>
    </section>
  );
}
