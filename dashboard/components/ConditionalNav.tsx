"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function ConditionalNav() {
  const pathname = usePathname();

  // Sin nav para: login, auth, panel (tiene su propio nav)
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/panel")
  ) {
    return null;
  }

  return (
    <nav style={{
      background: "#1a1a2e",
      color: "white",
      padding: "0 28px",
      height: 58,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 17 }}>Recepcionista IA</span>
          <span style={{
            fontSize: 11, background: "#312e81", padding: "2px 8px",
            borderRadius: 10, color: "#a5b4fc",
          }}>Agencia</span>
        </div>
        <Link href="/" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>
          Clientes
        </Link>
        <Link href="/chat" style={{ color: "#94a3b8", textDecoration: "none", fontSize: 14 }}>
          Probar agente
        </Link>
      </div>
      <form action="/auth/logout" method="POST">
        <button type="submit" style={{
          background: "none", border: "1px solid #4b5563", color: "#9ca3af",
          borderRadius: 6, padding: "5px 14px", fontSize: 13, cursor: "pointer",
        }}>
          Cerrar sesión
        </button>
      </form>
    </nav>
  );
}
