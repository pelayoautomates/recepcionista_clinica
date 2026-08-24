import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Atiende360 — Recepcionista IA para clínicas",
    short_name: "Atiende360",
    description:
      "Recepcionista IA para clínicas privadas: recupera llamadas no atendidas, agenda citas y deriva a humano cuando hace falta.",
    lang: "es-ES",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f7fc",
    theme_color: "#0f4bd9",
    categories: ["business", "medical", "productivity"],
    icons: [
      {
        src: "/icon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
