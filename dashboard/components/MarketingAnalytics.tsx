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
    <aside
      aria-label="Preferencias de cookies"
      style={{
        position: "fixed", left: 16, right: 16, bottom: 16, zIndex: 1000,
        maxWidth: 720, margin: "0 auto", padding: "18px 20px", borderRadius: 16,
        background: "#0a1733", color: "white", boxShadow: "0 20px 55px rgba(2,8,23,.32)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 360px" }}>
        <strong style={{ display: "block", marginBottom: 4 }}>Tu privacidad, sin letra pequeña</strong>
        <span style={{ fontSize: 13.5, lineHeight: 1.45, color: "#dbeafe" }}>
          Las cookies técnicas son necesarias. Solo activamos medición publicitaria de Meta si la aceptas.{" "}
          <a href="/privacidad" style={{ color: "#bfdbfe", textDecoration: "underline" }}>
            Ver detalles
          </a>
        </span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => { setConsent("denied"); setConsentState("denied"); }}
          style={{ border: "1px solid #64748b", background: "transparent", color: "white", borderRadius: 10, padding: "10px 14px", fontWeight: 700 }}
        >
          Solo necesarias
        </button>
        <button
          type="button"
          onClick={() => { setConsent("granted"); setConsentState("granted"); }}
          style={{ border: 0, background: "#2563eb", color: "white", borderRadius: 10, padding: "10px 14px", fontWeight: 800 }}
        >
          Aceptar medición
        </button>
      </div>
    </aside>
  );
}
