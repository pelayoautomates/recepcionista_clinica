import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f4f7fc",
          color: "#0a1733",
          padding: 72,
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 34,
            fontWeight: 800,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "linear-gradient(135deg, #0f4bd9 0%, #17a0d6 100%)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            AT360
          </div>
          Atiende360
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ color: "#0f4bd9", fontSize: 28, fontWeight: 800 }}>
            Recepcionista IA para clinicas privadas
          </div>
          <div style={{ fontSize: 76, lineHeight: 0.96, fontWeight: 800, letterSpacing: -2 }}>
            Convierte llamadas y mensajes en citas trazables
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 26, color: "#3f4f6f" }}>
            <span>Telefono</span>
            <span>WhatsApp</span>
            <span>Google Calendar</span>
          </div>
        </div>
      </div>
    ),
    size
  );
}
