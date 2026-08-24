"use client";

import { useEffect } from "react";

const REVEALED = "mk-revealed";
const ENABLED = "mk-js-reveal";

/**
 * Convierte las animaciones de entrada (`animFadeUp` / `animFadeIn`) en
 * animaciones disparadas al hacer scroll, en lugar de al cargar la página.
 *
 * Degrada bien: si no hay JS o no hay IntersectionObserver, la clase `ENABLED`
 * nunca se añade al <html> y las animaciones se comportan como antes.
 */
export default function ScrollReveal({ selector }: { selector: string }) {
  useEffect(() => {
    const root = document.documentElement;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || typeof IntersectionObserver === "undefined") return;

    root.classList.add(ENABLED);

    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const reveal = (n: Element) => n.classList.add(REVEALED);
    const revealAll = () => nodes.forEach(reveal);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal(entry.target);
          observer.unobserve(entry.target);
        }
      },
      // Umbral 0 y margen superior amplio: un bloque alto se revela en cuanto
      // asoma, aunque nunca llegue a verse un porcentaje concreto.
      { rootMargin: "120px 0px -5% 0px", threshold: 0 },
    );

    // Lo que ya está por encima del scroll actual se revela sin esperar.
    for (const n of nodes) {
      const r = n.getBoundingClientRect();
      if (r.top < window.innerHeight) reveal(n);
      else observer.observe(n);
    }

    // Red de seguridad: nada puede quedarse invisible de forma permanente.
    const failsafe = window.setTimeout(revealAll, 2500);

    return () => {
      window.clearTimeout(failsafe);
      observer.disconnect();
      root.classList.remove(ENABLED);
    };
  }, [selector]);

  return null;
}
