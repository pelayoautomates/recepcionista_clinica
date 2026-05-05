import Link from "next/link";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

async function getConversaciones(clinicId: string) {
  const res = await fetch(`${BACKEND}/admin/clinicas/${clinicId}/conversaciones`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

const ESTADO_STYLE: Record<string, { bg: string; color: string }> = {
  activa: { bg: "#dcfce7", color: "#166534" },
  esperando_humano: { bg: "#fef3c7", color: "#92400e" },
  resuelta: { bg: "#f3f4f6", color: "#6b7280" },
};

export default async function ConversacionesPage({ params }: { params: { id: string } }) {
  const conversaciones = await getConversaciones(params.id);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Conversaciones</h1>
        {conversaciones.filter((c: any) => c.estado === "esperando_humano").length > 0 && (
          <span style={{ background: "#f59e0b", color: "white", borderRadius: 12, padding: "4px 12px", fontSize: 13 }}>
            {conversaciones.filter((c: any) => c.estado === "esperando_humano").length} esperando humano
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {conversaciones.map((conv: any) => {
          const estilo = ESTADO_STYLE[conv.estado] || ESTADO_STYLE.activa;
          return (
            <Link key={conv.id} href={`/clinicas/${params.id}/conversaciones/${conv.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{
                background: "white",
                borderRadius: 8,
                padding: "14px 20px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: conv.estado === "esperando_humano" ? "2px solid #f59e0b" : "1px solid transparent",
              }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Canal: {conv.canal || "—"}</span>
                  <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 12 }}>
                    {new Date(conv.updated_at).toLocaleString("es-ES")}
                  </span>
                </div>
                <span style={{
                  background: estilo.bg,
                  color: estilo.color,
                  borderRadius: 12,
                  padding: "2px 10px",
                  fontSize: 12,
                  fontWeight: 500,
                }}>
                  {conv.estado}
                </span>
              </div>
            </Link>
          );
        })}
        {conversaciones.length === 0 && (
          <div style={{ background: "white", borderRadius: 8, padding: 32, textAlign: "center", color: "#9ca3af" }}>
            Sin conversaciones todavía
          </div>
        )}
      </div>
    </div>
  );
}
