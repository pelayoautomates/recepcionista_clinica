"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

// ─── Types ─────────────────────────────────────────────────────────────────────

type TourStep = "welcome" | "url" | "gcal" | "done";

interface SavedState {
  step: TourStep;
  urlScraped?: boolean;
}

interface Props {
  clinicId: string;
  clinicName: string;
  isNewUser: boolean;
  gcalConnected: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STEP_ORDER: TourStep[] = ["welcome", "url", "gcal", "done"];
const PAD = 10;
const CARD_W = 340;

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function GuidedTour({ clinicId, clinicName, isNewUser, gcalConnected }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const KEY = `tour_v2_${clinicId}`;

  const [step, setStep] = useState<TourStep>("welcome");
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // URL step
  const [tourUrl, setTourUrl] = useState("");
  const [urlConfirming, setUrlConfirming] = useState(false);
  const [urlScraping, setUrlScraping] = useState(false);
  const [urlScraped, setUrlScraped] = useState(false);
  const [urlError, setUrlError] = useState("");

  // GCal spotlight
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Init
  useEffect(() => {
    setIsMobile(window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    if (!isNewUser) { setDone(true); setReady(true); return; }
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "done") { setDone(true); setReady(true); return; }
      if (saved) {
        const s: SavedState = JSON.parse(saved);
        if (s.step) setStep(s.step);
        if (s.urlScraped) setUrlScraped(true);
      }
    } catch { /* ignore */ }
    setReady(true);
  }, [clinicId, isNewUser, KEY]);

  // Navigate to configuracion for GCal step
  useEffect(() => {
    if (!ready || done || step !== "gcal") return;
    if (!pathname.startsWith("/panel/configuracion")) {
      router.push("/panel/configuracion");
    }
  }, [step, done, ready, pathname, router]);

  // Spotlight element for GCal
  useEffect(() => {
    if (!ready || done || step !== "gcal") { setRect(null); return; }
    let attempts = 0;
    const tryFind = () => {
      const el = document.querySelector('[data-tour="config-gcal"]') as HTMLElement | null;
      if (el) {
        setRect(el.getBoundingClientRect());
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (++attempts < 30) {
        setTimeout(tryFind, 250);
      }
    };
    setTimeout(tryFind, 500);
    const update = () => {
      const el = document.querySelector('[data-tour="config-gcal"]') as HTMLElement | null;
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [step, pathname, done, ready]);

  function saveAndGo(next: TourStep) {
    setStep(next);
    const state: SavedState = { step: next, urlScraped };
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  async function scrapeAndSave() {
    if (!tourUrl.trim()) return;
    setUrlScraping(true);
    setUrlError("");
    setUrlConfirming(false);
    try {
      const form = new FormData();
      form.append("url", tourUrl.trim());
      const extractRes = await fetch(`/api/clinicas/${clinicId}/configuracion/extraer`, { method: "POST", body: form });
      if (!extractRes.ok) throw new Error((await extractRes.json()).detail || "Error al analizar la web");
      const data = await extractRes.json();

      // Build doc
      const lines: string[] = [];
      if (clinicName) lines.push(`Clinica: ${clinicName}`);
      if (data.resumen) lines.push(`\n${data.resumen}`);
      if (data.ubicacion) lines.push(`\nUbicacion: ${data.ubicacion}`);
      if (data.telefono) lines.push(`Telefono: ${data.telefono}`);
      if (data.web) lines.push(`Web: ${data.web}`);
      if (data.servicios?.length) {
        lines.push(`\nServicios:`);
        data.servicios.forEach((s: any) => {
          let l = `- ${s.nombre}`;
          if (s.precio) l += ` (${s.precio})`;
          if (s.descripcion) l += `: ${s.descripcion}`;
          lines.push(l);
        });
      }
      if (data.horarios && Object.keys(data.horarios).length) {
        lines.push(`\nHorarios:`);
        Object.entries(data.horarios).forEach(([d, h]) => lines.push(`- ${d}: ${h}`));
      }
      if (data.faqs?.length) {
        lines.push(`\nPreguntas frecuentes:`);
        data.faqs.forEach((f: any) => lines.push(`- ${f.pregunta}\n  ${f.respuesta}`));
      }
      const doc = lines.join("\n");
      const prompt = `Eres la recepcionista virtual de ${clinicName}. Responde siempre en espanol.\n\nINFORMACION VERIFICADA DE LA CLINICA:\n${doc}\n\nINSTRUCCIONES:\n- Usa un tono cercano pero profesional.\n- Si el paciente quiere agendar una cita, usa las herramientas para consultar disponibilidad y crear la cita.\n- Si no sabes algo con certeza, dilo claramente y ofrece derivar a un humano.\n- Nunca inventes precios, horarios ni servicios que no esten en la informacion proporcionada.\n- Cuando detectes interes real en agendar, pide nombre, telefono, servicio y fecha preferida.`;

      // Save to backend
      await fetch(`/api/clinicas/${clinicId}/configuracion/guardar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_personalizado: prompt,
          servicios: { _doc: doc },
          horarios: {},
          routing_mode: "siempre",
        }),
      });

      setUrlScraped(true);
      localStorage.setItem(KEY, JSON.stringify({ step: "url", urlScraped: true }));
    } catch (e: any) {
      setUrlError(e.message || "No se pudo analizar la web. Puedes continuar sin ella.");
    } finally {
      setUrlScraping(false);
    }
  }

  async function complete() {
    setDone(true);
    localStorage.setItem(KEY, "done");
    try {
      await fetch(`/api/clinicas/${clinicId}/onboarding-ok`, { method: "POST" });
    } catch { /* non-critical */ }
    router.push("/panel");
  }

  if (!ready || done) return null;

  const progress = Math.round((STEP_ORDER.indexOf(step) / (STEP_ORDER.length - 1)) * 100);

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9990,
        background: "rgba(9,18,38,0.65)",
        pointerEvents: step === "gcal" && rect ? "none" : "auto",
      }} />

      {/* Spotlight punch-through for GCal */}
      {step === "gcal" && rect && (
        <div style={{
          position: "fixed",
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          borderRadius: 12,
          boxShadow: "0 0 0 9999px rgba(9,18,38,0.65)",
          border: "2px solid rgba(255,255,255,0.3)",
          zIndex: 9991,
          pointerEvents: "none",
          transition: "all 0.25s ease",
        }} />
      )}

      {/* ── STEP: welcome ── */}
      {step === "welcome" && (
        <CenteredModal progress={progress}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>👋</div>
          <h2 style={modalTitle}>¡Bienvenido a Atiende360!</h2>
          <p style={modalBody}>
            Vamos a configurar tu recepcionista en <strong>3 pasos rápidos</strong>. En menos de 5 minutos estará lista para atender a tus pacientes.
          </p>

          {isMobile && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 14px", marginBottom: 20, textAlign: "left" }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#92400e" }}>💻 Mejor desde el ordenador</p>
              <p style={{ margin: 0, fontSize: 12.5, color: "#78350f", lineHeight: 1.5 }}>
                Recomendamos completar la configuración desde un ordenador para tener la mejor experiencia. Puedes volver cuando tengas uno disponible — guardaremos tu progreso.
              </p>
            </div>
          )}

          <button onClick={() => saveAndGo("url")} style={primaryBtn}>
            ¡Empezar configuración! →
          </button>
          <p style={{ margin: "12px 0 0", fontSize: 12, color: "#9ca3af" }}>
            Tu progreso se guarda automáticamente
          </p>
        </CenteredModal>
      )}

      {/* ── STEP: url ── */}
      {step === "url" && !urlScraping && (
        <CenteredModal progress={progress}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🌐</div>
          <h2 style={modalTitle}>Paso 1 — Web de tu clínica</h2>

          {!urlScraped ? (
            <>
              <p style={modalBody}>
                Si tienes página web, pégala aquí. La IA leerá todas las secciones y aprenderá tus servicios, horarios y precios <strong>automáticamente</strong>.
              </p>

              {!urlConfirming ? (
                <>
                  <input
                    type="url"
                    value={tourUrl}
                    onChange={e => setTourUrl(e.target.value)}
                    placeholder="https://miclinica.com"
                    style={urlInputSt}
                    onKeyDown={e => { if (e.key === "Enter" && tourUrl.trim()) setUrlConfirming(true); }}
                    autoFocus
                  />
                  {urlError && (
                    <p style={{ fontSize: 13, color: "#dc2626", margin: "8px 0 0", textAlign: "left" }}>{urlError}</p>
                  )}
                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    {tourUrl.trim() ? (
                      <>
                        <button onClick={() => setUrlConfirming(true)} style={{ ...primaryBtn, flex: 2 }}>
                          Analizar mi web →
                        </button>
                        <button onClick={() => saveAndGo("gcal")} style={{ ...secondaryBtn, flex: 1 }}>
                          Saltar
                        </button>
                      </>
                    ) : (
                      <button onClick={() => saveAndGo("gcal")} style={{ ...secondaryBtn, width: "100%" }}>
                        No tengo web, siguiente →
                      </button>
                    )}
                  </div>
                </>
              ) : (
                /* Confirmation */
                <>
                  <div style={{ background: "#f3f4f6", borderRadius: 10, padding: "14px 16px", marginBottom: 16, textAlign: "left" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b7280", fontWeight: 500 }}>Web a analizar:</p>
                    <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: "#111827", wordBreak: "break-all" }}>
                      {(() => { try { return new URL(tourUrl).hostname; } catch { return tourUrl; } })()}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", wordBreak: "break-all" }}>{tourUrl}</p>
                  </div>
                  <p style={{ ...modalBody, marginBottom: 16 }}>
                    Vamos a leer esta web para entrenar a tu agente. El proceso tarda unos 30 segundos.
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setUrlConfirming(false)} style={{ ...secondaryBtn, flex: 1 }}>← Cambiar</button>
                    <button onClick={scrapeAndSave} style={{ ...primaryBtn, flex: 2 }}>Sí, es mi web →</button>
                  </div>
                </>
              )}
            </>
          ) : (
            /* Success */
            <>
              <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 10, padding: "14px 16px", marginBottom: 20, textAlign: "left" }}>
                <p style={{ margin: "0 0 4px", fontSize: 13.5, fontWeight: 700, color: "#166534" }}>✓ ¡Web analizada con éxito!</p>
                <p style={{ margin: 0, fontSize: 13, color: "#15803d", lineHeight: 1.5 }}>
                  He aprendido los servicios, horarios y precios de <strong>{(() => { try { return new URL(tourUrl).hostname; } catch { return "tu clínica"; } })()}</strong>. Tu agente ya está entrenado con esta información.
                </p>
              </div>
              <button onClick={() => saveAndGo("gcal")} style={primaryBtn}>
                Siguiente →
              </button>
            </>
          )}
        </CenteredModal>
      )}

      {/* Scraping loading */}
      {step === "url" && urlScraping && (
        <CenteredModal progress={progress}>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>🔍</div>
            <h2 style={modalTitle}>Analizando tu web...</h2>
            <p style={{ ...modalBody, marginBottom: 24 }}>
              Leyendo todas las páginas de{" "}
              <strong>{(() => { try { return new URL(tourUrl).hostname; } catch { return tourUrl; } })()}</strong>{" "}
              para aprender sobre tu clínica. Esto puede tardar hasta 30 segundos.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 7 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 11, height: 11, borderRadius: "50%", background: "#2563eb",
                  animation: `dotBounce 1.3s ease-in-out ${i * 0.22}s infinite`,
                }} />
              ))}
            </div>
          </div>
          <style>{`
            @keyframes dotBounce {
              0%, 80%, 100% { transform: scale(0.3); opacity: 0.4; }
              40% { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </CenteredModal>
      )}

      {/* ── STEP: gcal ── tooltip ── */}
      {step === "gcal" && rect && (
        <GCalTooltip
          rect={rect}
          progress={progress}
          clinicId={clinicId}
          gcalConnected={gcalConnected}
          onNext={() => saveAndGo("done")}
        />
      )}

      {/* ── STEP: done ── */}
      {step === "done" && (
        <CenteredModal progress={progress}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🚀</div>
          <h2 style={modalTitle}>¡Todo listo!</h2>
          <p style={modalBody}>
            Tu recepcionista está configurada. Puedes probarla ahora desde{" "}
            <strong>Configuración → Probar agente</strong> o esperar a que lleguen llamadas reales.
          </p>
          <div style={{ background: "#f9fafb", borderRadius: 12, padding: "16px", marginBottom: 24, textAlign: "left" }}>
            {[
              "Clínica creada",
              "Agente entrenado con tu información",
              "Configuración de agenda revisada",
            ].map(text => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
                <span style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: "#dcfce7", color: "#166534",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>✓</span>
                <span style={{ fontSize: 13.5, color: "#374151", fontWeight: 500 }}>{text}</span>
              </div>
            ))}
          </div>
          <button onClick={complete} style={primaryBtn}>Ir al panel →</button>
        </CenteredModal>
      )}
    </>
  );
}

// ─── CenteredModal ─────────────────────────────────────────────────────────────

function CenteredModal({ progress, children }: { progress: number; children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 9999,
      background: "white",
      borderRadius: 20,
      padding: "36px 32px 30px",
      maxWidth: 460,
      width: "calc(100vw - 40px)",
      boxShadow: "0 24px 72px rgba(0,0,0,0.26)",
      textAlign: "center",
    }}>
      <div style={{ height: 4, background: "#e5e7eb", borderRadius: 2, marginBottom: 24, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${progress}%`,
          background: "linear-gradient(90deg,#2563eb,#4f46e5)",
          borderRadius: 2, transition: "width 0.4s ease",
        }} />
      </div>
      {children}
    </div>
  );
}

// ─── GCal Tooltip ──────────────────────────────────────────────────────────────

function GCalTooltip({ rect, progress, clinicId, gcalConnected, onNext }: {
  rect: DOMRect; progress: number; clinicId: string; gcalConnected: boolean; onNext: () => void;
}) {
  const MARGIN = 18;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  const spotTop = rect.top - PAD;
  const spotLeft = rect.left - PAD;
  const spotW = rect.width + PAD * 2;
  const spotH = rect.height + PAD * 2;
  const spotCX = spotLeft + spotW / 2;

  const showAbove = spotTop > 280;
  const cardLeft = Math.max(8, Math.min(spotCX - CARD_W / 2, vw - CARD_W - 8));

  const cardStyle: React.CSSProperties = showAbove
    ? { bottom: vh - spotTop + MARGIN, left: cardLeft }
    : { top: spotTop + spotH + MARGIN, left: cardLeft };

  const arrowStyle: React.CSSProperties = showAbove
    ? { position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)", ...arrowDown }
    : { position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", ...arrowUp };

  const backendUrl = typeof window !== "undefined"
    ? (window as any).__ENV__?.NEXT_PUBLIC_BACKEND_URL || ""
    : "";

  return (
    <div style={{
      position: "fixed", zIndex: 9999,
      background: "white", borderRadius: 16,
      padding: "18px 20px", width: CARD_W,
      boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
      ...cardStyle,
    }}>
      <div style={arrowStyle} />

      <div style={{ height: 3, background: "#e5e7eb", borderRadius: 2, marginBottom: 13, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#2563eb,#4f46e5)", transition: "width 0.3s" }} />
      </div>

      <h3 style={{ margin: "0 0 6px", fontSize: 14.5, fontWeight: 700, color: "#111827" }}>
        Paso 2 — Conecta Google Calendar
      </h3>

      {gcalConnected ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, background: "#dcfce7", borderRadius: 8, padding: "8px 12px" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>✓ Conectado</span>
            <span style={{ fontSize: 12, color: "#15803d" }}>El agente puede gestionar citas</span>
          </div>
          <button onClick={onNext} style={{ ...primaryBtn, padding: "9px 16px", fontSize: 13.5, minHeight: 38, borderRadius: 9 }}>
            Siguiente →
          </button>
        </>
      ) : (
        <>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#6b7280", lineHeight: 1.55 }}>
            Conecta tu agenda para que el agente vea tu disponibilidad y reserve citas directamente.{" "}
            <span style={{ color: "#9ca3af" }}>Puedes hacerlo más tarde.</span>
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href={`${backendUrl}/auth/google/${clinicId}`}
              style={{
                flex: 2, ...primaryBtn,
                textDecoration: "none", display: "inline-flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 13, padding: "9px 14px",
                minHeight: 36, borderRadius: 9,
              }}
            >
              Conectar Calendar
            </a>
            <button onClick={onNext} style={{ flex: 1, ...secondaryBtn, fontSize: 13, padding: "9px 10px" }}>
              Ahora no
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const modalTitle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: 22,
  fontWeight: 800,
  color: "#111827",
  letterSpacing: "-0.02em",
};

const modalBody: React.CSSProperties = {
  margin: "0 0 20px",
  color: "#6b7280",
  fontSize: 15,
  lineHeight: 1.6,
};

const primaryBtn: React.CSSProperties = {
  background: "linear-gradient(135deg, #2563eb, #4f46e5)",
  color: "white",
  border: "none",
  borderRadius: 12,
  padding: "13px 24px",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%",
  minHeight: 44,
  letterSpacing: "-0.01em",
};

const secondaryBtn: React.CSSProperties = {
  background: "#f3f4f6",
  color: "#374151",
  border: "none",
  borderRadius: 12,
  padding: "13px 20px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  minHeight: 44,
};

const urlInputSt: React.CSSProperties = {
  width: "100%",
  border: "2px solid #e5e7eb",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  color: "#111827",
  textAlign: "left",
  transition: "border-color 0.15s",
};

const arrowUp: React.CSSProperties = {
  width: 0, height: 0,
  borderLeft: "8px solid transparent",
  borderRight: "8px solid transparent",
  borderBottom: "10px solid white",
};
const arrowDown: React.CSSProperties = {
  width: 0, height: 0,
  borderLeft: "8px solid transparent",
  borderRight: "8px solid transparent",
  borderTop: "10px solid white",
};
