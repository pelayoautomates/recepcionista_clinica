import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { adminFetch } from "@/lib/api";

const ESTADO_STYLE: Record<string, { bg: string; color: string }> = {
  activa: { bg: "#dcfce7", color: "#166534" },
  esperando_humano: { bg: "#fef3c7", color: "#92400e" },
  resuelta: { bg: "#f3f4f6", color: "#6b7280" },
};

export default async function PanelConversacionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rolRes = await adminFetch(`/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`);
  const rol = await rolRes.json();
  if (rol.rol !== "clinica") redirect("/login?error=sin_acceso");

  const res = await adminFetch(`/admin/clinicas/${rol.clinic_id}/conversaciones`, { noStore: true });
  const conversaciones = res.ok ? await res.json() : [];

  const esperando = conversaciones.filter((c: any) => c.estado === "esperando_humano").length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Conversaciones</h1>
        {esperando > 0 && (
          <span style={{ background: "#f59e0b", color: "white", borderRadius: 12, padding: "4px 14px", fontSize: 13, fontWeight: 600 }}>
            {esperando} esperando respuesta
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {conversaciones.map((conv: any) => {
          const estilo = ESTADO_STYLE[conv.estado] || ESTADO_STYLE.activa;
          return (
            <Link key={conv.id} href={`/panel/conversaciones/${conv.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                background: "white", borderRadius: 8, padding: "14px 20px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                border: conv.estado === "esperando_humano" ? "2px solid #f59e0b" : "1px solid #e5e7eb",
                cursor: "pointer",
              }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14, color: "#111827" }}>Canal: {conv.canal || "—"}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                    {new Date(conv.updated_at).toLocaleString("es-ES")}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    background: estilo.bg, color: estilo.color,
                    borderRadius: 12, padding: "2px 10px", fontSize: 12, fontWeight: 500,
                  }}>
                    {conv.estado}
                  </span>
                  <span style={{ color: "#9ca3af", fontSize: 16 }}>→</span>
                </div>
              </div>
            </Link>
          );
        })}
        {conversaciones.length === 0 && (
          <div style={{ background: "white", borderRadius: 8, padding: 48, textAlign: "center", color: "#9ca3af", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            No hay conversaciones todavía
          </div>
        )}
      </div>
    </div>
  );
}
