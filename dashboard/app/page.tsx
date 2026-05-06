import Link from "next/link";
import { adminFetch } from "@/lib/api";

async function getClinicas() {
  const res = await adminFetch("/admin/clinicas", { noStore: true });
  if (!res.ok) return [];
  return res.json();
}

async function getMetricas(clinicId: string) {
  const res = await adminFetch(`/admin/clinicas/${clinicId}/metricas`, { noStore: true });
  if (!res.ok) return { leads_hoy: 0, citas_hoy: 0, conversaciones_esperando_humano: 0 };
  return res.json();
}

export default async function AgenciaDashboard() {
  const clinicas = await getClinicas();
  const metricasPromises = clinicas.map((c: any) => getMetricas(c.id));
  const todasMetricas = await Promise.all(metricasPromises);

  const totales = todasMetricas.reduce(
    (acc, m) => ({
      leads: acc.leads + (m.leads_hoy || 0),
      citas: acc.citas + (m.citas_hoy || 0),
      esperando: acc.esperando + (m.conversaciones_esperando_humano || 0),
    }),
    { leads: 0, citas: 0, esperando: 0 }
  );

  const conCalendario = clinicas.filter((c: any) => c.google_tokens_enc).length;
  const conWhatsapp = clinicas.filter((c: any) => c.whatsapp_number).length;
  const alertas = clinicas.filter((_: any, i: number) =>
    todasMetricas[i].conversaciones_esperando_humano > 0
  ).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>Panel de Agencia</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
            {clinicas.length} clínica{clinicas.length !== 1 ? "s" : ""} activa{clinicas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/clinicas/nueva" style={{
          background: "#1a1a2e", color: "white", textDecoration: "none",
          borderRadius: 8, padding: "9px 18px", fontSize: 14, fontWeight: 500,
        }}>
          + Nueva clínica
        </Link>
      </div>

      {/* Métricas globales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 28 }}>
        <MetricCard label="Leads hoy" value={totales.leads} color="#2563eb" />
        <MetricCard label="Citas hoy" value={totales.citas} color="#166534" />
        <MetricCard label="Esperando humano" value={totales.esperando} color={totales.esperando > 0 ? "#b45309" : "#6b7280"} alert={totales.esperando > 0} />
        <MetricCard label="Con Google Cal" value={conCalendario} suffix={`/ ${clinicas.length}`} color="#7c3aed" />
        <MetricCard label="Con WhatsApp" value={conWhatsapp} suffix={`/ ${clinicas.length}`} color="#059669" />
      </div>

      {/* Alertas activas */}
      {alertas > 0 && (
        <div style={{
          background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8,
          padding: "12px 18px", marginBottom: 20, fontSize: 13, color: "#92400e",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <strong>{alertas} clínica{alertas > 1 ? "s" : ""}</strong> tiene{alertas > 1 ? "n" : ""} conversaciones esperando respuesta humana.
        </div>
      )}

      {/* Grid de clínicas */}
      {clinicas.length === 0 ? (
        <div style={{ background: "white", padding: 48, borderRadius: 10, textAlign: "center", color: "#9ca3af", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏥</div>
          <p style={{ margin: "0 0 16px", fontSize: 16, color: "#374151" }}>Aún no tienes clínicas</p>
          <Link href="/clinicas/nueva" style={{
            background: "#1a1a2e", color: "white", textDecoration: "none",
            borderRadius: 8, padding: "10px 20px", fontSize: 14,
          }}>
            Crear primera clínica
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {clinicas.map((clinica: any, i: number) => (
            <ClinicaCard key={clinica.id} clinica={clinica} metricas={todasMetricas[i]} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClinicaCard({ clinica, metricas }: { clinica: any; metricas: any }) {
  const tieneAlerta = metricas.conversaciones_esperando_humano > 0;
  const tieneCalendario = !!clinica.google_tokens_enc;
  const tieneWhatsapp = !!clinica.whatsapp_number;
  const tienePrompt = !!clinica.prompt_personalizado;

  return (
    <div style={{
      background: "white", borderRadius: 10, overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      border: tieneAlerta ? "2px solid #fcd34d" : "1px solid #e5e7eb",
    }}>
      {/* Header card */}
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: "0 0 2px", fontSize: 16, fontWeight: 700, color: "#111827" }}>{clinica.nombre}</h2>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>{clinica.telefono || clinica.email_contacto || "Sin contacto"}</span>
          </div>
          {tieneAlerta && (
            <span style={{ background: "#fef9c3", color: "#92400e", borderRadius: 10, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
              {metricas.conversaciones_esperando_humano} pendiente{metricas.conversaciones_esperando_humano > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Métricas de hoy */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
        <StatCell label="Leads hoy" value={metricas.leads_hoy} />
        <StatCell label="Citas hoy" value={metricas.citas_hoy} border />
        <StatCell label="Esperando" value={metricas.conversaciones_esperando_humano} alert={tieneAlerta} border />
      </div>

      {/* Estado integraciones */}
      <div style={{ padding: "10px 18px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 6, flexWrap: "wrap" }}>
        <IntBadge ok={tieneCalendario} label="Google Cal" />
        <IntBadge ok={tieneWhatsapp} label="WhatsApp" />
        <IntBadge ok={tienePrompt} label="Prompt IA" />
      </div>

      {/* Acciones */}
      <div style={{ padding: "10px 18px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8 }}>
        <Link href={`/clinicas/${clinica.id}`} style={btnStyle("#f3f4f6", "#374151")}>
          Editar
        </Link>
        <Link href={`/clinicas/${clinica.id}/conversaciones`} style={btnStyle("#f3f4f6", "#374151")}>
          Conversaciones
        </Link>
        <Link href={`/clinicas/${clinica.id}/leads`} style={btnStyle("#f3f4f6", "#374151")}>
          Leads
        </Link>
        {tieneAlerta && (
          <Link href={`/clinicas/${clinica.id}/conversaciones`} style={btnStyle("#fef9c3", "#92400e")}>
            Ver alertas ⚠
          </Link>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, suffix, alert }: {
  label: string; value: number; color: string; suffix?: string; alert?: boolean;
}) {
  return (
    <div style={{
      background: alert ? "#fffbeb" : "white",
      border: `1px solid ${alert ? "#fcd34d" : "#e5e7eb"}`,
      borderRadius: 10, padding: "16px 18px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>
        {value}{suffix && <span style={{ fontSize: 14, fontWeight: 400, color: "#9ca3af", marginLeft: 4 }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
    </div>
  );
}

function StatCell({ label, value, alert, border }: { label: string; value: number; alert?: boolean; border?: boolean }) {
  return (
    <div style={{
      padding: "12px 16px",
      borderLeft: border ? "1px solid #f3f4f6" : "none",
      background: alert ? "#fffbeb" : "transparent",
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: alert ? "#b45309" : "#111827" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function IntBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 8, fontWeight: 500,
      background: ok ? "#f0fdf4" : "#f9fafb",
      color: ok ? "#166534" : "#9ca3af",
      border: `1px solid ${ok ? "#86efac" : "#e5e7eb"}`,
    }}>
      {ok ? "✓" : "○"} {label}
    </span>
  );
}

function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    fontSize: 12, padding: "5px 10px", borderRadius: 6,
    background: bg, color, textDecoration: "none", fontWeight: 500,
  };
}
