import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

import { adminFetch } from "@/lib/api";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const rolRes = await adminFetch(
    `/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`
  );
  const rol = await rolRes.json();

  if (rol.rol !== "clinica") redirect("/login?error=sin_acceso");

  const clinicaRes = await adminFetch(`/admin/clinicas/${rol.clinic_id}`);
  const clinica = await clinicaRes.json();

  return (
    <>
      <nav style={{
        background: "#166534",
        color: "white",
        padding: "0 28px",
        height: 58,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 17 }}>🏥 {clinica.nombre}</span>
            <span style={{
              fontSize: 11, background: "#14532d", padding: "2px 8px",
              borderRadius: 10, color: "#86efac",
            }}>Panel Clínica</span>
          </div>
          {[
            { href: "/panel", label: "Inicio" },
            { href: "/panel/conversaciones", label: "Conversaciones" },
            { href: "/panel/leads", label: "Leads" },
            { href: "/panel/citas", label: "Citas" },
            { href: "/panel/calendario", label: "Calendario" },
            { href: "/panel/configuracion", label: "Configuración" },
          ].map(({ href, label }) => (
            <a key={href} href={href} style={{ color: "#86efac", textDecoration: "none", fontSize: 14 }}>
              {label}
            </a>
          ))}
        </div>
        <form action="/auth/logout" method="POST">
          <button type="submit" style={{
            background: "none", border: "1px solid #4ade80", color: "#4ade80",
            borderRadius: 6, padding: "5px 14px", fontSize: 13, cursor: "pointer",
          }}>
            Cerrar sesión
          </button>
        </form>
      </nav>
      <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto", minHeight: "calc(100vh - 58px)", background: "#f0fdf4" }}>
        {children}
      </main>
    </>
  );
}
