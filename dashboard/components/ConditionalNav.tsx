"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Clínicas", exact: true },
  { href: "/chat", label: "Probar agente", exact: false },
];

export default function ConditionalNav() {
  const pathname = usePathname();

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/panel")
  ) return null;

  return (
    <nav style={{
      background: "#0f172a",
      height: 58,
      padding: "0 40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky",
      top: 0,
      zIndex: 50,
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      {/* Left: logo + links */}
      <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          {/* Mark */}
          <div style={{
            width: 28, height: 28,
            background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
            borderRadius: 7,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="3.5" cy="3.5" r="2" fill="white" fillOpacity="0.95" />
              <circle cx="9.5" cy="3.5" r="2" fill="white" fillOpacity="0.45" />
              <circle cx="3.5" cy="9.5" r="2" fill="white" fillOpacity="0.45" />
              <circle cx="9.5" cy="9.5" r="2" fill="white" fillOpacity="0.95" />
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, color: "white", letterSpacing: "-0.02em" }}>
            RecepIA
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600,
            letterSpacing: "0.08em", textTransform: "uppercase",
            background: "rgba(99,102,241,0.18)",
            color: "#a5b4fc",
            padding: "2px 7px", borderRadius: 20,
          }}>
            Agencia
          </span>
        </div>

        <div style={{ display: "flex", gap: 2 }}>
          {NAV_LINKS.map(({ href, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} style={{
                fontSize: 13.5, fontWeight: 500,
                color: active ? "white" : "#94a3b8",
                padding: "5px 12px",
                borderRadius: 6,
                background: active ? "rgba(255,255,255,0.08)" : "transparent",
                textDecoration: "none",
              }}>
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right: actions */}
      <form action="/auth/logout" method="POST">
        <button type="submit" style={{
          fontSize: 13, fontWeight: 500,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#94a3b8",
          borderRadius: 7,
          padding: "6px 14px",
          cursor: "pointer",
          fontFamily: "inherit",
        }}>
          Cerrar sesión
        </button>
      </form>
    </nav>
  );
}
