const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

async function getJobs(clinicId: string) {
  const res = await fetch(`${BACKEND}/admin/clinicas/${clinicId}/jobs`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

const ESTADO_STYLE: Record<string, { bg: string; color: string }> = {
  pendiente: { bg: "#dbeafe", color: "#1e40af" },
  ejecutando: { bg: "#fef3c7", color: "#92400e" },
  ejecutado: { bg: "#dcfce7", color: "#166534" },
  fallido: { bg: "#fee2e2", color: "#991b1b" },
};

export default async function JobsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobs = await getJobs(id);

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 20 }}>Jobs programados</h1>
      <div style={{ background: "white", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              {["Tipo", "Fecha programada", "Estado", "Intentos", "Error"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#374151" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((job: any) => {
              const estilo = ESTADO_STYLE[job.estado] || ESTADO_STYLE.pendiente;
              return (
                <tr key={job.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 16px" }}>{job.tipo}</td>
                  <td style={{ padding: "10px 16px", color: "#6b7280", fontSize: 12 }}>
                    {new Date(job.fecha_programada).toLocaleString("es-ES")}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{
                      background: estilo.bg,
                      color: estilo.color,
                      borderRadius: 12,
                      padding: "2px 10px",
                      fontSize: 12,
                    }}>
                      {job.estado}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", color: "#6b7280" }}>{job.intentos}</td>
                  <td style={{ padding: "10px 16px", color: "#ef4444", fontSize: 12 }}>
                    {job.error ? job.error.substring(0, 60) + (job.error.length > 60 ? "…" : "") : "—"}
                  </td>
                </tr>
              );
            })}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>Sin jobs registrados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
