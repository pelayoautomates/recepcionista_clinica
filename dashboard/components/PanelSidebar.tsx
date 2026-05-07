"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

const LINKS = [
  {
    href: "/panel", label: "Inicio", exact: true,
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <path d="M2 7.5L8.5 2.5L15 7.5V15H11V11H6V15H2V7.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
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
        <rect x="2" y="3" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 7H15" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 1.5V4.5M11.5 1.5V4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/panel/calendario", label: "Calendario", exact: false,
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <rect x="2" y="3" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2 7H15M5.5 1.5V4.5M11.5 1.5V4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="5" y="10" width="2.5" height="2.5" rx="0.5" fill="currentColor" fillOpacity="0.5" />
      </svg>
    ),
  },
  {
    href: "/panel/configuracion", label: "Configuración", exact: false,
    icon: (
      <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
        <circle cx="8.5" cy="8.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8.5 2V3.5M8.5 13.5V15M2 8.5H3.5M13.5 8.5H15M3.93 3.93L5 5M12 12L13.07 13.07M3.93 13.07L5 12M12 5L13.07 3.93" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

interface Props {
  clinicName: string;
}

export default function PanelSidebar({ clinicName }: Props) {
  const pathname = usePathname();

  return (
    <aside style={{
      position: "fixed", top: 0, left: 0, bottom: 0,
      width: 240,
      background: "white",
      borderRight: "1px solid #e5e7eb",
      display: "flex",
      flexDirection: "column",
      zIndex: 40,
    }}>
      {/* Logo */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: "1px solid #f3f4f6",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
            borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
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
              para clínicas
            </div>
          </div>
        </div>
      </div>

      {/* Clinic name */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#f9fafb", border: "1px solid #e5e7eb",
          borderRadius: 8, padding: "8px 12px",
          cursor: "pointer",
        }}>
          <div style={{
            width: 24, height: 24,
            background: "#dbeafe",
            borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 10V5.5L6 2L11 5.5V10" stroke="#2563eb" strokeWidth="1.3" strokeLinejoin="round" />
              <rect x="4" y="6.5" width="2" height="3.5" rx="0.4" fill="#2563eb" fillOpacity="0.7" />
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {clinicName}
          </span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="#9ca3af" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "10px 12px", overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {LINKS.map(({ href, label, exact, icon }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px",
                borderRadius: 8,
                textDecoration: "none",
                background: active ? "#eff6ff" : "transparent",
                color: active ? "#2563eb" : "#6b7280",
                fontWeight: active ? 600 : 500,
                fontSize: 13.5,
                transition: "all 0.1s",
              }}>
                {icon}
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom: logout */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6" }}>
        <form action="/auth/logout" method="POST">
          <button type="submit" style={{
            width: "100%",
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 12px",
            borderRadius: 8,
            border: "none",
            background: "transparent",
            color: "#9ca3af",
            fontWeight: 500,
            fontSize: 13.5,
            cursor: "pointer",
            fontFamily: "inherit",
          }}>
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
              <path d="M6.5 2.5H3C2.45 2.5 2 2.95 2 3.5V13.5C2 14.05 2.45 14.5 3 14.5H6.5M11.5 11.5L15 8.5L11.5 5.5M15 8.5H6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
