"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const CONSENT_KEY = "a360_marketing_consent";
const INTERNAL_PREFIXES = ["/panel", "/agencia", "/onboarding", "/suscripcion", "/login", "/auth"];

export function hasMarketingConsent() {
  return typeof window !== "undefined" && localStorage.getItem(CONSENT_KEY) === "granted";
}

export function trackMetaEvent(name: string, eventId?: string) {
  if (!hasMarketingConsent() || !window.fbq) return;
  if (eventId) window.fbq("track", name, {}, { eventID: eventId });
  else window.fbq("track", name);
}

function setConsent(value: "granted" | "denied") {
  localStorage.setItem(CONSENT_KEY, value);
  document.cookie = `a360_marketing=${value}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
}

export default function MarketingAnalytics() {
  const pathname = usePathname();
  const [consent, setConsentState] = useState<"granted" | "denied" | null>(null);
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const isMarketingPage = !INTERNAL_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_KEY);
    setConsentState(saved === "granted" || saved === "denied" ? saved : null);
  }, []);

  useEffect(() => {
    if (!isMarketingPage || consent !== "granted" || !pixelId) return;
    if (!window.fbq) {
      const fbq = function (...args: unknown[]) {
        fbq.queue.push(args);
      } as typeof window.fbq & { queue: unknown[]; loaded?: boolean; version?: string };
      fbq.queue = [];
      fbq.loaded = true;
      fbq.version = "2.0";
      window.fbq = fbq;
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(script);
      window.fbq("init", pixelId);
    }
    window.fbq?.("track", "PageView");
  }, [consent, isMarketingPage, pathname, pixelId]);

  if (!isMarketingPage || consent !== null) return null;

  return (
    <>
      <style>{`
        .a360-cookie {
          position: fixed;
          left: 18px;
          bottom: 18px;
          z-index: 1000;
          width: min(388px, calc(100vw - 36px));
          padding: 18px 19px 17px;
          border-radius: 18px;
          background: #0a1733;
          color: #fff;
          border: 1px solid rgba(255,255,255,.1);
          box-shadow: 0 24px 60px rgba(2,8,23,.42);
          animation: a360CookieIn .5s cubic-bezier(.22,1,.36,1) .9s both;
        }
        @keyframes a360CookieIn {
          from { opacity: 0; transform: translateY(16px) scale(.97); }
          to   { opacity: 1; transform: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .a360-cookie { animation: none; }
        }
        /* Por encima de la barra fija de CTA en móvil */
        @media (max-width: 700px) {
          .a360-cookie { left: 12px; bottom: 84px; width: calc(100vw - 24px); }
        }
        .a360-cookie__actions { display: flex; gap: 8px; margin-top: 14px; }
        .a360-cookie button {
          flex: 1 1 0;
          min-width: 0;
          border-radius: 10px;
          padding: 10px 8px;
          font-size: 13px;
          white-space: nowrap;
          font-weight: 700;
          cursor: pointer;
          transition: background .18s ease, border-color .18s ease, transform .18s ease;
        }
        .a360-cookie button:hover { transform: translateY(-1px); }
        .a360-cookie button:focus-visible { outline: 2px solid #93c5fd; outline-offset: 2px; }
      `}</style>
      <aside className="a360-cookie" aria-label="Preferencias de cookies">
        <strong style={{ display: "block", marginBottom: 5, fontSize: 15 }}>
          Tu privacidad, sin letra pequeña
        </strong>
        <span style={{ display: "block", fontSize: 13.5, lineHeight: 1.5, color: "#c7d9f5" }}>
          Las cookies técnicas son necesarias. Solo activamos medición publicitaria de Meta si la
          aceptas.{" "}
          <a href="/privacidad" style={{ color: "#bfdbfe", textDecoration: "underline" }}>
            Ver detalles
          </a>
        </span>
        <div className="a360-cookie__actions">
          <button
            type="button"
            onClick={() => { setConsent("denied"); setConsentState("denied"); }}
            style={{ border: "1px solid #3d4d6d", background: "transparent", color: "white" }}
          >
            Solo necesarias
          </button>
          <button
            type="button"
            onClick={() => { setConsent("granted"); setConsentState("granted"); }}
            style={{ border: 0, background: "#2563eb", color: "white" }}
          >
            Aceptar medición
          </button>
        </div>
      </aside>
    </>
  );
}
