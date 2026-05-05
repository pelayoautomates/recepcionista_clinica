import Link from "next/link";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

async function getClinicas() {
  const res = await fetch(`${BACKEND}/admin/clinicas`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

async function getMetricas(clinicId: string) {
  const res = await fetch(`${BACKEND}/admin/clinicas/${clinicId}/metricas`, { cache: "no-store" });
  if (!res.ok) return { leads_hoy: 0, citas_hoy: 0, conversaciones_esperando_humano: 0 };
  return res.json();
}

export default async function HomePage() {
  const clinicas = await getClinicas();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Clientes</h1>
        <Link href="/clinicas/nueva" style={{
          background: "#1a1a2e", color: "white", textDecoration: "none",
          borderRadius: 8, padding: "9px 18px", fontSize: 14, fontWeight: 500,
        }}>
          + Nuevo cliente
        </Link>
      </div>

      {clinicas.length === 0 ? (
        <div style={{ background: "white", padding: 48, borderRadius: 8, textAlign: "center", color: "#9ca3af", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏥</div>
          <p style={{ margin: "0 0 16px", fontSize: 16, color: "#374151" }}>Aún no tienes clientes</p>
          <Link href="/clinicas/nueva" style={{
            background: "#1a1a2e", color: "white", textDecoration: "none",
            borderRadius: 8, padding: "10px 20px", fontSize: 14,
          }}>
            Crear primer cliente
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {clinicas.map((clinica: any) => (
            <ClinicaCard key={clinica.id} clinica={clinica} />
          ))}
        </div>
      )}
    </div>
  );
}

async function ClinicaCard({ clinica }: { clinica: any }) {
  const metricas = await getMetricas(clinica.id);
  const tieneAlerta = metricas.conversaciones_esperando_humano > 0;

  return (
    <Link href={`/clinicas/${clinica.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <div style={{
        background: "white",
        borderRadius: 8,
        padding: 20,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: tieneAlerta ? "2px solid #f59e0b" : "1px solid #e5e7eb",
        cursor: "pointer",
        transition: "box-shadow 0.15s",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: "0 0 2px", fontSize: 17 }}>{clinica.nombre}</h2>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{clinica.telefono || "Sin teléfono"}</span>
          </div>
          {tieneAlerta && (
            <span style={{
              background: "#f59e0b", color: "white",
              borderRadius: 12, padding: "2px 8px", fontSize: 12, fontWeight: 600,
            }}>
              {metricas.conversaciones_esperando_humano} pendiente{metricas.conversaciones_esperando_humano > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <Stat label="Leads hoy" value={metricas.leads_hoy} />
          <Stat label="Citas hoy" value={metricas.citas_hoy} />
        </div>

        {/* Indicadores de integración */}
        <div style={{ display: "flex", gap: 6 }}>
          <Badge activo={!!clinica.google_tokens_enc} label="Google Cal" />
          <Badge activo={!!clinica.whatsapp_number} label="WhatsApp" />
        </div>
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#f9fafb", borderRadius: 6, padding: "8px 12px", flex: 1 }}>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#6b7280" }}>{label}</div>
    </div>
  );
}

function Badge({ activo, label }: { activo: boolean; label: string }) {
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 500,
      background: activo ? "#dcfce7" : "#f3f4f6",
      color: activo ? "#166534" : "#9ca3af",
    }}>
      {activo ? "✓" : "○"} {label}
    </span>
  );
}
