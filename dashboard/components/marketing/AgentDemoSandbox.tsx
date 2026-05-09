"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./MarketingStyles.module.css";

type DemoMode = "chat" | "voice";

type Message = {
  role: "user" | "assistant";
  text: string;
};

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

function getDomainLabel(value: string) {
  try {
    const parsed = new URL(normalizeUrl(value));
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return value.trim() || "tu clinica";
  }
}

export default function AgentDemoSandbox() {
  const [mode, setMode] = useState<DemoMode>("chat");
  const [website, setWebsite] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceLive, setVoiceLive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");

  const recognitionRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const domainLabel = useMemo(() => getDomainLabel(website), [website]);
  const hasValidUrl = useMemo(() => {
    try {
      return Boolean(new URL(normalizeUrl(website)).hostname);
    } catch {
      return false;
    }
  }, [website]);

  useEffect(() => {
    const webkitSpeech = (window as any).webkitSpeechRecognition;
    const speechRecognition = (window as any).SpeechRecognition || webkitSpeech;
    setVoiceSupported(Boolean(speechRecognition));

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const speakAssistant = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "es-ES";
    utter.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || !hasValidUrl || loading) return;

    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/demo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website: normalizeUrl(website),
          message: text,
          conversationId,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || `Error ${res.status}`);
      }

      const data = await res.json();
      const reply = data?.reply || "No se ha recibido respuesta del agente.";

      setConversationId(data?.conversationId || null);
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);

      if (mode === "voice") {
        speakAssistant(reply);
      }
    } catch (e: any) {
      setError(e?.message || "No se pudo generar la demo real con esa URL.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const onEnter = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const message = input;
      setInput("");
      void sendMessage(message);
    }
  };

  const startVoiceDemo = () => {
    if (!voiceSupported || !hasValidUrl || loading) return;

    if (voiceLive) {
      recognitionRef.current?.stop();
      setVoiceLive(false);
      return;
    }

    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || "";
      setVoiceTranscript(transcript);
      void sendMessage(transcript);
    };

    recognition.onerror = () => {
      setError("No se pudo capturar audio. Revisa permisos de microfono.");
      setVoiceLive(false);
    };

    recognition.onend = () => {
      setVoiceLive(false);
    };

    recognitionRef.current = recognition;
    setVoiceTranscript("");
    setVoiceLive(true);
    recognition.start();
  };

  const resetConversation = () => {
    setMessages([]);
    setConversationId(null);
    setError("");
    setVoiceTranscript("");
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setVoiceLive(false);
    }
  };

  return (
    <section className={styles.demoSplit}>
      <div className={styles.demoInteractiveSide}>
        <label className={styles.demoUrlLabel}>
          URL de tu clinica
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="ejemplo: clinicabellaestetica.com"
          />
        </label>

        <div className={styles.demoModeToggle}>
          <button
            type="button"
            className={mode === "chat" ? styles.demoModeActive : ""}
            onClick={() => setMode("chat")}
          >
            Probar por chat
          </button>
          <button
            type="button"
            className={mode === "voice" ? styles.demoModeActive : ""}
            onClick={() => setMode("voice")}
          >
            Probar por voz
          </button>
        </div>

        <div className={styles.demoPhoneShell}>
          <div className={styles.demoPhoneTopBar}>
            <strong>{domainLabel || "tu-clinica.com"}</strong>
            <span>{mode === "chat" ? "Chat" : "Llamada"}</span>
          </div>

          {mode === "chat" ? (
            <>
              <div className={styles.demoPhoneMessages}>
                {messages.length === 0 && (
                  <div className={styles.demoPhoneEmpty}>
                    {hasValidUrl
                      ? "Escribe como paciente y prueba la respuesta real del agente."
                      : "Primero introduce una URL valida de clinica."}
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`${styles.demoPhoneBubble} ${message.role === "assistant" ? styles.demoPhoneBubbleAssistant : styles.demoPhoneBubbleUser}`}
                  >
                    {message.text}
                  </div>
                ))}

                {loading && <div className={styles.demoPhoneTyping}>Agente360 escribiendo...</div>}
                <div ref={bottomRef} />
              </div>

              <div className={styles.demoPhoneInputRow}>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onEnter}
                  placeholder={hasValidUrl ? "Escribe como paciente..." : "Primero introduce la URL"}
                  disabled={!hasValidUrl || loading}
                />
                <button
                  type="button"
                  onClick={() => {
                    const message = input;
                    setInput("");
                    void sendMessage(message);
                  }}
                  disabled={!hasValidUrl || !input.trim() || loading}
                  className={styles.btnPrimarySolid}
                >
                  Enviar
                </button>
              </div>
            </>
          ) : (
            <div className={styles.voiceCallShell}>
              <div className={styles.voicePulse} aria-hidden="true" />
              <p>{voiceLive ? "Escuchando..." : "Listo para hablar"}</p>
              <strong>{voiceLive ? "Llamada en curso" : "Pulsa para iniciar"}</strong>
              {voiceTranscript && <small>Tu ultima frase: "{voiceTranscript}"</small>}

              <button
                type="button"
                className={styles.btnPrimarySolid}
                onClick={startVoiceDemo}
                disabled={!voiceSupported || !hasValidUrl || loading}
              >
                {voiceLive ? "Detener llamada" : "Iniciar llamada"}
              </button>
            </div>
          )}
        </div>

        <div className={styles.demoActions}>
          <button type="button" className={styles.btnSecondary} onClick={resetConversation}>
            Reiniciar demo
          </button>
        </div>

        {error && <p className={styles.demoNotice}>{error}</p>}
      </div>

      <aside className={styles.demoCopySide}>
        <p className={styles.demoTag}>Demo interactiva</p>
        <h3 className={styles.demoTitle}>Demo real en formato movil estilo WhatsApp</h3>
        <p className={styles.demoBody}>
          Escribe la URL de tu clinica y el sistema la analiza para responder con contexto de tu negocio.
          Cambia entre chat y voz para validar ambas experiencias en la misma landing.
        </p>
        {!voiceSupported && (
          <p className={styles.demoNotice}>
            Tu navegador no soporta reconocimiento de voz. Puedes usar chat sin limitaciones.
          </p>
        )}
      </aside>
    </section>
  );
}
