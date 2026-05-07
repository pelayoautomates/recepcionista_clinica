"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

const LINKS = [
  { href: "/panel", label: "Inicio", exact: true },
  { href: "/panel/conversaciones", label: "Conversaciones", exact: false },
  { href: "/panel/leads", label: "Leads", exact: false },
  { href: "/panel/citas", label: "Citas", exact: false },
  { href: "/panel/calendario", label: "Calendario", exact: false },
  { href: "/panel/configuracion", label: "Configuración", exact: false },
];

export default function PanelNavLinks() {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {LINKS.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} style={{
            fontSize: 13,
            fontWeight: active ? 600 : 500,
            color: active ? "#1f2937" : "#6b7280",
            padding: "6px 11px",
            borderRadius: 7,
            background: active ? "#f3f4f6" : "transparent",
            textDecoration: "none",
            border: active ? "1px solid #e5e7eb" : "1px solid transparent",
          }}>
            {label}
          </Link>
        );
      })}
    </div>
  );
}
