import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { adminFetch } from "@/lib/api";
import PanelSidebar from "@/components/PanelSidebar";

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

  const userName = user.email?.split("@")[0] ?? "Usuario";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f6f7f9" }}>
      {/* Sidebar */}
      <PanelSidebar clinicName={clinica.nombre} />

      {/* Main area */}
      <div style={{ flex: 1, marginLeft: 240, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Top bar */}
        <header style={{
          height: 60,
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "0 28px",
          position: "sticky",
          top: 0,
          zIndex: 30,
          gap: 16,
        }}>
          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Notifications */}
            <div style={{ position: "relative", cursor: "pointer" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2.5C7.24 2.5 5 4.74 5 7.5V11L3 13H17L15 11V7.5C15 4.74 12.76 2.5 10 2.5Z" stroke="#6b7280" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M8.5 15C8.5 15.83 9.17 16.5 10 16.5C10.83 16.5 11.5 15.83 11.5 15" stroke="#6b7280" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <div style={{
                width: 32, height: 32,
                background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontSize: 12, fontWeight: 700,
              }}>
                {userName.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "#111827" }}>
                {clinica.nombre}
              </span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="#9ca3af" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: "28px 32px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
