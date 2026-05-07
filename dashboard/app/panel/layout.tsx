import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { adminFetch } from "@/lib/api";
import PanelNavLinks from "@/components/PanelNavLinks";

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
    <div style={{ minHeight: "100vh", background: "#f6f7f9" }}>
      <nav style={{
        background: "#ffffff",
        height: 62,
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid #e5e7eb",
      }}>
        {/* Left: brand + links */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{
                width: 32, height: 32,
                background: "#eef2ff",
                borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 14V6l6-4 6 4v8" stroke="#4f46e5" strokeWidth="1.4" strokeLinejoin="round" strokeOpacity="0.92" />
                  <rect x="6" y="9" width="2.5" height="5" rx="0.5" fill="#4f46e5" fillOpacity="0.9" />
                  <rect x="9.5" y="8" width="2.5" height="2.5" rx="0.5" fill="#6366f1" fillOpacity="0.8" />
                </svg>
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: "#111827", letterSpacing: "-0.01em" }}>
                  {clinica.nombre}
                </div>
                <div style={{
                  fontSize: 10, color: "#9ca3af",
                  fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase",
                }}>
                  Panel Clínica
              </div>
            </div>
          </div>

          <PanelNavLinks />
        </div>

        {/* Right: logout */}
        <form action="/auth/logout" method="POST">
          <button type="submit" style={{
            fontSize: 13, fontWeight: 500,
            background: "#ffffff",
            border: "1px solid #d1d5db",
            color: "#374151",
            borderRadius: 7,
            padding: "6px 14px",
            cursor: "pointer",
            fontFamily: "inherit",
          }}>
            Salir
          </button>
        </form>
      </nav>

      <main style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "24px 20px",
        minHeight: "calc(100vh - 60px)",
      }}>
        {children}
      </main>
    </div>
  );
}
