import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recepcionista IA — Panel Interno",
  description: "Panel de gestión para la Recepcionista IA para Clínicas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f5f5f5" }}>
        <nav style={{
          background: "#1a1a2e",
          color: "white",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Recepcionista IA</span>
          <a href="/" style={{ color: "#ccc", textDecoration: "none", fontSize: 14 }}>Clientes</a>
          <a href="/chat" style={{ color: "#ccc", textDecoration: "none", fontSize: 14 }}>Probar agente</a>
        </nav>
        <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
