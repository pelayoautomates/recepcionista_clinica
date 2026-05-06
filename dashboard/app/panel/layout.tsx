import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const rolRes = await fetch(`${BACKEND}/me/rol?user_id=${user.id}&email=${user.email}`);
  const rol = await rolRes.json();

  if (rol.rol !== "clinica") redirect("/login?error=sin_acceso");

  const clinicaRes = await fetch(`${BACKEND}/admin/clinicas/${rol.clinic_id}`);
  const clinica = await clinicaRes.json();

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f5f5f5" }}>
        <nav style={{
          background: "#0f766e", color: "white",
          padding: "0 24px", height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>🏥 {clinica.nombre}</span>
            <a href="/panel" style={{ color: "#99f6e4", textDecoration: "none", fontSize: 14 }}>Inicio</a>
            <a href="/panel/conversaciones" style={{ color: "#99f6e4", textDecoration: "none", fontSize: 14 }}>Conversaciones</a>
            <a href="/panel/leads" style={{ color: "#99f6e4", textDecoration: "none", fontSize: 14 }}>Leads</a>
            <a href="/panel/citas" style={{ color: "#99f6e4", textDecoration: "none", fontSize: 14 }}>Citas</a>
            <a href="/panel/configuracion" style={{ color: "#99f6e4", textDecoration: "none", fontSize: 14 }}>Configuración</a>
          </div>
          <LogoutButton />
        </nav>
        <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}

function LogoutButton() {
  return (
    <form action="/auth/logout" method="POST">
      <button type="submit" style={{
        background: "none", border: "1px solid #99f6e4", color: "#99f6e4",
        borderRadius: 6, padding: "4px 12px", fontSize: 13, cursor: "pointer",
      }}>
        Cerrar sesión
      </button>
    </form>
  );
}
