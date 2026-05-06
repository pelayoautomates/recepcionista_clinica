import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

const ESTADO_COLORES: Record<string, { bg: string; color: string }> = {
  confirmada: { bg: "#dcfce7", color: "#166534" },
  cancelada: { bg: "#fee2e2", color: "#991b1b" },
  completada: { bg: "#f3f4f6", color: "#6b7280" },
  no_asistio: { bg: "#fff3cd", color: "#856404" },
};

export default async function PanelCitasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rolRes = await fetch(`${BACKEND}/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`);
  const rol = await rolRes.json();
  if (rol.rol !== "clinica") redirect("/login?error=sin_acceso");

  const hoy = new Date().toISOString().split("T")[0];
  const res = await fetch(`${BACKEND}/admin/clinicas/${rol.clinic_id}/citas?fecha=${hoy}`, { cache: "no-store" });
  const citas = res.ok ? await res.json() : [];

  const fechaHoy = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Citas</h1>
      <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: 14 }}>Hoy — {fechaHoy}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {citas.map((cita: any) => {
          const estilo = ESTADO_COLORES[cita.estado] || ESTADO_COLORES.confirmada;
          const horaInicio = cita.fecha_inicio
            ? new Date(cita.fecha_inicio).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
            : "—";
          const horaFin = cita.fecha_fin
            ? new Date(cita.fecha_fin).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
            : "";
          return (
            <div key={cita.id} style={{
              background: "white", borderRadius: 8, padding: "14px 20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{cita.tipo_servicio || "Cita"}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>{horaInicio}{horaFin ? ` — ${horaFin}` : ""}</div>
              </div>
              <span style={{
                background: estilo.bg, color: estilo.color,
                borderRadius: 12, padding: "2px 10px", fontSize: 12, fontWeight: 500,
              }}>
                {cita.estado}
              </span>
            </div>
          );
        })}
        {citas.length === 0 && (
          <div style={{ background: "white", borderRadius: 8, padding: 48, textAlign: "center", color: "#9ca3af", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            No hay citas para hoy
          </div>
        )}
      </div>
    </div>
  );
}
