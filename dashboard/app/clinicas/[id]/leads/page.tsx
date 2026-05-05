const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

const ESTADO_COLORES: Record<string, string> = {
  anonimo: "#9ca3af",
  nuevo: "#3b82f6",
  contactado: "#8b5cf6",
  interesado: "#f59e0b",
  cita_agendada: "#10b981",
  completado: "#6b7280",
  perdido: "#ef4444",
  requiere_humano: "#dc2626",
};

async function getLeads(clinicId: string) {
  const res = await fetch(`${BACKEND}/admin/clinicas/${clinicId}/leads`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export default async function LeadsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const leads = await getLeads(id);

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>Leads</h1>
      <div style={{ background: "white", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              {["Nombre", "Teléfono", "Canal", "Estado", "Fecha"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#374151" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead: any) => (
              <tr key={lead.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "10px 16px" }}>{lead.nombre || <span style={{ color: "#9ca3af" }}>Anónimo</span>}</td>
                <td style={{ padding: "10px 16px" }}>{lead.telefono || "—"}</td>
                <td style={{ padding: "10px 16px", color: "#6b7280" }}>{lead.canal_origen || "—"}</td>
                <td style={{ padding: "10px 16px" }}>
                  <span style={{
                    background: ESTADO_COLORES[lead.estado_lead] || "#9ca3af",
                    color: "white",
                    borderRadius: 12,
                    padding: "2px 10px",
                    fontSize: 12,
                    fontWeight: 500,
                  }}>
                    {lead.estado_lead}
                  </span>
                </td>
                <td style={{ padding: "10px 16px", color: "#9ca3af", fontSize: 12 }}>
                  {new Date(lead.created_at).toLocaleDateString("es-ES")}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>Sin leads todavía</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
