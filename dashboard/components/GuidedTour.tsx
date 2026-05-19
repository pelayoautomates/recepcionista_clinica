"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

interface Step {
  title: string;
  body: string;
  cta: string;
  target?: string;
  side?: "top" | "right" | "bottom" | "left";
  navigateTo?: string;
  modal?: boolean;
}

const STEPS: Step[] = [
  {
    title: "¡Bienvenido a Atiende360! 🎉",
    body: "Tu recepcionista IA ya está creada. Vamos a configurarla en 4 pasos para que empiece a atender a tus pacientes hoy.",
    cta: "Empezar →",
    modal: true,
  },
  {
    title: "Paso 1 de 4 — Configura tu agente",
    body: "Aquí personalizas cómo responde tu recepcionista: servicios, horarios y estilo de comunicación.",
    cta: "Ir a Configuración →",
    target: "sidebar-config",
    side: "right",
    navigateTo: "/panel/configuracion",
  },
  {
    title: "Paso 2 de 4 — Web de tu clínica",
    body: "Si tienes página web, pégala aquí. La IA leerá todas las páginas y aprenderá tus servicios, precios y horarios automáticamente.",
    cta: "Siguiente →",
    target: "config-url",
    side: "top",
  },
  {
    title: "Paso 3 de 4 — Conecta Google Calendar",
    body: "Conecta tu calendario para que el agente vea tu disponibilidad real y pueda agendar citas directamente.",
    cta: "Siguiente →",
    target: "config-gcal",
    side: "top",
  },
  {
    title: "Paso 4 de 4 — Activa tus canales",
    body: "Aquí activas el teléfono IA y WhatsApp para que los pacientes puedan contactar a tu clínica.",
    cta: "Ir a Canales →",
    target: "sidebar-canales",
    side: "right",
    navigateTo: "/panel/canales",
  },
  {
    title: "¡Todo listo! 🚀",
    body: "Tu recepcionista está configurada. Puedes explorar el panel o hacer una primera prueba desde Configuración → Probar agente.",
    cta: "Explorar el panel →",
    modal: true,
  },
];

const PAD = 8;
const CARD_W = 300;

interface Rect { top: number; left: number; width: number; height: number; bottom: number; right: number; }

export default function GuidedTour({ clinicId, isNewUser }: { clinicId: string; isNewUser: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const KEY = `tour_v1_${clinicId}`;

  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!isNewUser) { setDone(true); return; }
    const saved = localStorage.getItem(KEY);
    if (saved === "done") setDone(true);
    else if (saved) setStep(parseInt(saved) || 0);
  }, [clinicId, isNewUser, KEY]);

  // Find and track target element
  useEffect(() => {
    if (done) return;
    const s = STEPS[step];
    if (!s.target || s.modal) { setRect(null); return; }

    let attempts = 0;
    const tryFind = () => {
      const el = document.querySelector(`[data-tour="${s.target}"]`) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right });
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (++attempts < 20) {
        setTimeout(tryFind, 200);
      }
    };
    setTimeout(tryFind, 300);

    const update = () => {
      const el = document.querySelector(`[data-tour="${s.target}"]`) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right });
      }
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [step, pathname, done, KEY]);

  function next() {
    const s = STEPS[step];
    const nextIdx = step + 1;
    if (nextIdx >= STEPS.length) { complete(); return; }
    setStep(nextIdx);
    localStorage.setItem(KEY, String(nextIdx));
    if (s.navigateTo) router.push(s.navigateTo);
  }

  function complete() {
    setDone(true);
    localStorage.setItem(KEY, "done");
    router.push("/panel");
  }

  if (done) return null;

  const s = STEPS[step];
  const isModal = !!s.modal;
  const progress = Math.round((step / (STEPS.length - 1)) * 100);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9990,
          background: "rgba(9,18,38,0.62)",
          pointerEvents: isModal ? "auto" : "none",
        }}
      />

      {/* Spotlight punch-through */}
      {!isModal && rect && (
        <div
          style={{
            position: "fixed",
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: 12,
            boxShadow: "0 0 0 9999px rgba(9,18,38,0.62)",
            border: "2px solid rgba(255,255,255,0.25)",
            zIndex: 9990,
            pointerEvents: "none",
            transition: "top 0.25s ease, left 0.25s ease, width 0.25s ease, height 0.25s ease",
          }}
        />
      )}

      {/* Card */}
      {isModal ? (
        <CenteredModal step={s} stepIdx={step} progress={progress} onNext={next} onSkip={complete} />
      ) : rect ? (
        <TooltipCard step={s} stepIdx={step} progress={progress} rect={rect} onNext={next} onSkip={complete} />
      ) : null}
    </>
  );
}

// ─── Centered modal (welcome / done) ────────────────────────────────────────

function CenteredModal({ step, stepIdx, progress, onNext, onSkip }: {
  step: Step; stepIdx: number; progress: number; onNext: () => void; onSkip: () => void;
}) {
  const isLast = stepIdx === STEPS.length - 1;
  return (
    <div style={{
      position: "fixed", top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 9999,
      background: "white",
      borderRadius: 20,
      padding: "40px 36px",
      maxWidth: 460,
      width: "calc(100vw - 48px)",
      boxShadow: "0 24px 72px rgba(0,0,0,0.24)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>{isLast ? "🚀" : "🎉"}</div>

      {!isLast && (
        <div style={{ height: 4, background: "#e5e7eb", borderRadius: 2, marginBottom: 20, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#2563eb,#4f46e5)", borderRadius: 2, transition: "width 0.3s" }} />
        </div>
      )}

      <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>
        {step.title}
      </h2>
      <p style={{ margin: "0 0 28px", color: "#6b7280", fontSize: 15, lineHeight: 1.6 }}>
        {step.body}
      </p>

      <button onClick={onNext} style={primaryBtn}>{step.cta}</button>

      {!isLast && (
        <button onClick={onSkip} style={{ marginTop: 12, display: "block", width: "100%", background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 13, padding: "6px 0" }}>
          Configurar más tarde
        </button>
      )}
    </div>
  );
}

// ─── Positioned tooltip ───────────────────────────────────────────────────────

function TooltipCard({ step, stepIdx, progress, rect, onNext, onSkip }: {
  step: Step; stepIdx: number; progress: number; rect: Rect; onNext: () => void; onSkip: () => void;
}) {
  const MARGIN = 18;
  const CARD_H = 210;

  const spotTop = rect.top - PAD;
  const spotLeft = rect.left - PAD;
  const spotW = rect.width + PAD * 2;
  const spotH = rect.height + PAD * 2;
  const spotCX = spotLeft + spotW / 2;
  const spotCY = spotTop + spotH / 2;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  let cardStyle: React.CSSProperties = {};
  let arrowStyle: React.CSSProperties = {};

  switch (step.side) {
    case "right":
      cardStyle = {
        top: Math.max(8, Math.min(spotCY - CARD_H / 2, vh - CARD_H - 8)),
        left: Math.min(spotLeft + spotW + MARGIN, vw - CARD_W - 8),
      };
      arrowStyle = { position: "absolute", left: -10, top: "50%", transform: "translateY(-50%)", ...arrowLeft };
      break;
    case "top":
      cardStyle = {
        bottom: vh - spotTop + MARGIN,
        left: Math.max(8, Math.min(spotCX - CARD_W / 2, vw - CARD_W - 8)),
      };
      arrowStyle = { position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)", ...arrowDown };
      break;
    case "bottom":
      cardStyle = {
        top: spotTop + spotH + MARGIN,
        left: Math.max(8, Math.min(spotCX - CARD_W / 2, vw - CARD_W - 8)),
      };
      arrowStyle = { position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", ...arrowUp };
      break;
    case "left":
      cardStyle = {
        top: Math.max(8, Math.min(spotCY - CARD_H / 2, vh - CARD_H - 8)),
        right: vw - spotLeft + MARGIN,
      };
      arrowStyle = { position: "absolute", right: -10, top: "50%", transform: "translateY(-50%)", ...arrowRight };
      break;
  }

  return (
    <div style={{
      position: "fixed",
      zIndex: 9999,
      background: "white",
      borderRadius: 16,
      padding: "18px 20px",
      width: CARD_W,
      boxShadow: "0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
      ...cardStyle,
    }}>
      {/* Arrow pointer */}
      <div style={arrowStyle} />

      {/* Progress */}
      <div style={{ height: 3, background: "#e5e7eb", borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#2563eb,#4f46e5)", borderRadius: 2, transition: "width 0.3s" }} />
      </div>

      <h3 style={{ margin: "0 0 7px", fontSize: 14.5, fontWeight: 700, color: "#111827", letterSpacing: "-0.01em" }}>
        {step.title}
      </h3>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: "#6b7280", lineHeight: 1.55 }}>
        {step.body}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <button onClick={onSkip} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#9ca3af", padding: 0, flexShrink: 0 }}>
          Saltar guía
        </button>
        <button onClick={onNext} style={{ ...primaryBtn, padding: "8px 16px", fontSize: 13, minHeight: 34, borderRadius: 9 }}>
          {step.cta}
        </button>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

const arrowLeft: React.CSSProperties = {
  width: 0, height: 0,
  borderTop: "8px solid transparent",
  borderBottom: "8px solid transparent",
  borderRight: "10px solid white",
};
const arrowRight: React.CSSProperties = {
  width: 0, height: 0,
  borderTop: "8px solid transparent",
  borderBottom: "8px solid transparent",
  borderLeft: "10px solid white",
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
