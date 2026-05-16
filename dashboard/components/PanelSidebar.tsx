"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

const NAV_MAIN = [
  {
    href: "/panel/estadisticas", label: "Estadísticas", exact: false,
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <path d="M2 13.5L6 8.5L9.5 11L13 5.5L15.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 15H15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/panel/conversaciones", label: "Conversaciones", exact: false,
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <path d="M14 2H3C2.45 2 2 2.45 2 3V11C2 11.55 2.45 12 3 12H5V15L9 12H14C14.55 12 15 11.55 15 11V3C15 2.45 14.55 2 14 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/panel/leads", label: "Leads", exact: false,
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <circle cx="8.5" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.5 14.5C2.5 11.74 5.19 9.5 8.5 9.5C11.81 9.5 14.5 11.74 14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/panel/citas", label: "Citas", exact: false,
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <rect x="3.5" y="2.5" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 2.5V4.5M11 2.5V4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M6 7.5H11M6 10H11M6 12.5H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/panel/calendario", label: "Calendario", exact: false,
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <rect x="2" y="3" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 7H15M5.5 1.5V4.5M11.5 1.5V4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5 10.5H7M10 10.5H12M5 13H7M10 13H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
];

const NAV_AJUSTES = [
  {
    href: "/panel/configuracion", label: "Configuración", exact: false,
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <path d="M9.6 2.5a1.1 1.1 0 00-2.2 0l-.22 1.15c-.38.1-.74.26-1.07.47l-1.02-.38a1.1 1.1 0 00-1.34 1.34l.38 1.02c-.21.33-.37.69-.47 1.07L2.5 7.4a1.1 1.1 0 000 2.2l1.15.22c.1.38.26.74.47 1.07l-.38 1.02a1.1 1.1 0 001.34 1.34l1.02-.38c.33.21.69.37 1.07.47l.22 1.15a1.1 1.1 0 002.2 0l.22-1.15c.38-.1.74-.26 1.07-.47l1.02.38a1.1 1.1 0 001.34-1.34l-.38-1.02c.21-.33.37-.69.47-1.07l1.15-.22a1.1 1.1 0 000-2.2l-1.15-.22a4 4 0 00-.47-1.07l.38-1.02a1.1 1.1 0 00-1.34-1.34l-1.02.38a4 4 0 00-1.07-.47L9.6 2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <circle cx="8.5" cy="8.5" r="2.2" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
  },
  {
    href: "/panel/agenda", label: "Servicios", exact: false,
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <path d="M3 5H14M3 9H10M3 13H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="13.5" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M12.5 12H13.5V13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/panel/canales", label: "Canales", exact: false,
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <circle cx="3.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="13.5" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="13.5" cy="12.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5 8.5L12 5M5 8.5L12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/panel/facturacion", label: "Mi Plan", exact: false,
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <rect x="2" y="4" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 7H15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M5 10.5H7M10 10.5H12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
];

interface Props {
  clinicName: string;
  pendientesHumano?: number;
}

export default function PanelSidebar({ clinicName, pendientesHumano = 0 }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function NavLink({ href, label, exact, icon }: { href: string; label: string; exact: boolean; icon: React.ReactNode }) {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 12px",
          borderRadius: 8,
          textDecoration: "none",
          background: active ? "#eff6ff" : "transparent",
          color: active ? "#2563eb" : "#6b7280",
          fontWeight: active ? 600 : 500,
          fontSize: 13.5,
          transition: "all 0.1s",
        }}
      >
        {icon}
        <span style={{ flex: 1 }}>{label}</span>
        {href === "/panel/conversaciones" && pendientesHumano > 0 && (
          <span style={{
            minWidth: 18, height: 18, borderRadius: 9, background: "#ef4444",
            color: "white", fontSize: 10.5, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 5px",
          }}>
            {pendientesHumano > 99 ? "99+" : pendientesHumano}
          </span>
        )}
      </Link>
    );
  }

  return (
    <>
      <style>{`
        @media (min-width: 768px) {
          .sidebar-mobile-toggle { display: none !important; }
          .panel-sidebar { transform: none !important; position: fixed !important; }
        }
        @media (max-width: 767px) {
          .panel-sidebar { transform: translateX(-100%); transition: transform 0.25s ease; position: fixed; }
          .panel-sidebar.open { transform: translateX(0); }
        }
      `}</style>

      <button
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
        style={{
          position: "fixed", top: 14, left: 16, zIndex: 50,
          width: 38, height: 38, background: "white",
          border: "1px solid #e5e7eb", borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 5H15M3 9H15M3 13H15" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 39 }} />
      )}

      <aside
        className={`panel-sidebar${mobileOpen ? " open" : ""}`}
        style={{ top: 0, left: 0, bottom: 0, width: 240, background: "white", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", zIndex: 40 }}
      >
        {/* Logo → /panel */}
        <Link
          href="/panel"
          onClick={() => setMobileOpen(false)}
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid #f3f4f6",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            textDecoration: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36,
              background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
              borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 13V7.5L9 3.5L15 7.5V13" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
                <rect x="7" y="8" width="4" height="5" rx="0.75" fill="white" fillOpacity="0.9" />
                <circle cx="9" cy="6" r="1" fill="white" fillOpacity="0.6" />
              </svg>
            </div>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", letterSpacing: "-0.01em" }}>
                Recepcionista IA
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>
                {clinicName}
              </div>
            </div>
          </div>

          <button
            className="sidebar-mobile-toggle"
            onClick={e => { e.preventDefault(); setMobileOpen(false); }}
            aria-label="Cerrar menú"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", color: "#6b7280" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </Link>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "10px 12px", overflowY: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV_MAIN.map(item => (
              <NavLink key={item.href} {...item} />
            ))}

            <div style={{ margin: "10px 4px 4px", fontSize: 10.5, fontWeight: 600, color: "#d1d5db", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Ajustes
            </div>

            {NAV_AJUSTES.map(item => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </nav>

        {/* Logout */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6" }}>
          <form action="/auth/logout" method="POST">
            <button type="submit" style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 8, border: "none",
              background: "transparent", color: "#9ca3af",
              fontWeight: 500, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit",
            }}>
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                <path d="M6.5 2.5H3C2.45 2.5 2 2.95 2 3.5V13.5C2 14.05 2.45 14.5 3 14.5H6.5M11.5 11.5L15 8.5L11.5 5.5M15 8.5H6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
