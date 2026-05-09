import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activa tu plan | Atiende360",
};

export default function SuscripcionPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f0f4ff 0%, #fafafa 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 520, textAlign: "center" }}>
        {/* Logo */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 36,
        }}>
          <div style={{
            width: 36, height: 36,
            background: "linear-gradient(135deg, #2563eb, #4f46e5)",
            borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>A</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 17, color: "#111827" }}>Atiende360</span>
        </div>

        <div style={{
          background: "white",
          borderRadius: 20,
          padding: "48px 40px",
          boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
          <h1 style={{ margin: "0 0 12px", fontSize: 24, fontWeight: 700, color: "#111827" }}>
            Tu período de prueba ha terminado
          </h1>
          <p style={{ margin: "0 0 32px", color: "#6b7280", fontSize: 15, lineHeight: 1.6 }}>
            Gracias por probar Atiende360. Para seguir usando tu recepcionista IA,
            activa uno de nuestros planes.
          </p>

          {/* Plan destacado */}
          <div style={{
            background: "linear-gradient(135deg, #eff6ff, #eef2ff)",
            border: "2px solid #2563eb",
            borderRadius: 14,
            padding: "24px 28px",
            marginBottom: 24,
            textAlign: "left",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 16, color: "#1e40af" }}>
                  Plan Starter
                </p>
                <p style={{ margin: 0, fontSize: 13, color: "#3b82f6" }}>
                  Para clínicas que quieren empezar
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 26, color: "#111827" }}>
                  99€
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>/mes</p>
              </div>
            </div>
            <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
              <li>300 minutos de llamadas IA al mes</li>
              <li>Agente de voz + webchat</li>
              <li>Google Calendar + citas automáticas</li>
              <li>Panel de conversaciones y leads</li>
              <li>Sin permanencia, cancela cuando quieras</li>
            </ul>
          </div>

          <Link
            href="/pricing"
            style={{
              display: "block",
              background: "linear-gradient(135deg, #2563eb, #4f46e5)",
              color: "white",
              textDecoration: "none",
              borderRadius: 10,
              padding: "14px 24px",
              fontSize: 15,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            Ver todos los planes →
          </Link>

          <p style={{ margin: "16px 0 0", fontSize: 12, color: "#9ca3af" }}>
            ¿Tienes dudas?{" "}
            <a
              href="mailto:hola@atiende360.com"
              style={{ color: "#2563eb", textDecoration: "none" }}
            >
              Escríbenos
            </a>{" "}
            y te ayudamos.
          </p>
        </div>
      </div>
    </div>
  );
}
