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

export default async function AgenciaDashboardPage() {
  const clinicas = await getClinicas();
  const todasMetricas = await Promise.all(clinicas.map((c: any) => getMetricas(c.id)));

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
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 32,
        paddingBottom: 28,
        borderBottom: "1px solid #e2e8f0",
      }}>
        <div>
          <h1 style={{
            margin: "0 0 5px",
            fontSize: 27, fontWeight: 800,
            color: "#0f172a", letterSpacing: "-0.03em",
          }}>
            Panel de Agencia
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: "#64748b" }}>
            {clinicas.length} clínica{clinicas.length !== 1 ? "s" : ""} activa{clinicas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/clinicas/nueva" style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          background: "#0f172a", color: "white",
          fontSize: 13.5, fontWeight: 600,
          padding: "9px 18px", borderRadius: 8,
          letterSpacing: "-0.01em", textDecoration: "none",
        }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v11M1 6.5h11" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Nueva clínica
        </Link>
      </div>

      {/* Métricas globales */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 12,
        marginBottom: 24,
      }}>
        <MetricCard label="Leads hoy" value={totales.leads} accent="#6366f1" />
        <MetricCard label="Citas hoy" value={totales.citas} accent="#0ea5e9" />
        <MetricCard
          label="Esperando humano"
          value={totales.esperando}
          accent={totales.esperando > 0 ? "#f59e0b" : "#cbd5e1"}
          alert={totales.esperando > 0}
        />
        <MetricCard label="Google Calendar" value={conCalendario} suffix={`/ ${clinicas.length}`} accent="#22c55e" />
        <MetricCard label="WhatsApp" value={conWhatsapp} suffix={`/ ${clinicas.length}`} accent="#16a34a" />
      </div>

      {/* Alert */}
      {alertas > 0 && (
        <div style={{
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderLeft: "3px solid #f59e0b",
          borderRadius: 8,
          padding: "11px 18px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13.5,
          color: "#92400e",
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M8 6v3M8 10.5v.5" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>
            <strong>{alertas} clínica{alertas > 1 ? "s" : ""}</strong> con conversaciones sin atender
          </span>
        </div>
      )}

      {/* Grid de clínicas */}
      {clinicas.length === 0 ? (
        <div style={{
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          padding: "64px 40px",
          textAlign: "center",
          boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
        }}>
          <div style={{
            width: 52, height: 52,
            background: "#f1f5f9",
            borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 21V10l9-7 9 7v11" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round" />
              <rect x="9" y="14" width="3" height="7" rx="1" stroke="#6366f1" strokeWidth="1.5" />
              <rect x="14" y="12" width="3" height="3" rx="0.75" stroke="#6366f1" strokeWidth="1.5" />
            </svg>
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
            Sin clínicas todavía
          </p>
          <p style={{ fontSize: 13.5, color: "#64748b", margin: "0 0 24px" }}>
            Crea tu primera clínica para empezar
          </p>
          <Link href="/clinicas/nueva" style={{
            background: "#0f172a", color: "white",
            padding: "10px 22px", borderRadius: 8,
            fontSize: 14, fontWeight: 600, textDecoration: "none",
          }}>
            Crear clínica
          </Link>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: 16,
        }}>
          {clinicas.map((clinica: any, i: number) => (
            <ClinicaCard key={clinica.id} clinica={clinica} metricas={todasMetricas[i]} />
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, accent, suffix, alert }: {
  label: string; value: number; accent: string; suffix?: string; alert?: boolean;
}) {
  return (
    <div style={{
      background: alert ? "#fffbeb" : "white",
      border: "1px solid #e2e8f0",
      borderTop: `3px solid ${accent}`,
      borderRadius: 10,
      padding: "18px 20px",
      boxShadow: "0 1px 3px rgba(15,23,42,0.05)",
    }}>
      <div style={{
        fontSize: 30, fontWeight: 800,
        color: alert ? "#b45309" : "#0f172a",
        letterSpacing: "-0.04em",
        lineHeight: 1, marginBottom: 7,
      }}>
        {value}
        {suffix && (
          <span style={{ fontSize: 14, fontWeight: 400, color: "#94a3b8", marginLeft: 5 }}>
            {suffix}
          </span>
        )}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 600,
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
      }}>
        {label}
      </div>
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
      background: "white",
      borderRadius: 12,
      border: `1px solid ${tieneAlerta ? "#fde68a" : "#e2e8f0"}`,
      boxShadow: tieneAlerta
        ? "0 0 0 3px rgba(245,158,11,0.07), 0 1px 3px rgba(15,23,42,0.06)"
        : "0 1px 3px rgba(15,23,42,0.06)",
      overflow: "hidden",
    }}>
      <div style={{ padding: "18px 20px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              margin: "0 0 3px",
              fontSize: 15.5, fontWeight: 700,
              color: "#0f172a", letterSpacing: "-0.02em",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {clinica.nombre}
            </h3>
            <span style={{ fontSize: 12.5, color: "#94a3b8" }}>
              {clinica.telefono || clinica.email_contacto || "Sin datos de contacto"}
            </span>
          </div>
          {tieneAlerta && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              background: "#fef9c3", color: "#92400e",
              padding: "3px 10px", borderRadius: 20,
              border: "1px solid #fde68a",
              flexShrink: 0,
            }}>
              {metricas.conversaciones_esperando_humano} pendiente{metricas.conversaciones_esperando_humano > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: "6px 20px 12px", display: "flex", gap: 5, flexWrap: "wrap" }}>
        <IntBadge ok={tieneCalendario} label="Google Cal" />
        <IntBadge ok={tieneWhatsapp} label="WhatsApp" />
        <IntBadge ok={tienePrompt} label="Prompt IA" />
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        borderTop: "1px solid #f1f5f9",
        borderBottom: "1px solid #f1f5f9",
      }}>
        <StatCell label="Leads hoy" value={metricas.leads_hoy} />
        <StatCell label="Citas hoy" value={metricas.citas_hoy} border />
        <StatCell label="Esperando" value={metricas.conversaciones_esperando_humano} alert={tieneAlerta} border />
      </div>

      <div style={{ padding: "12px 16px", display: "flex", gap: 6, flexWrap: "wrap" }}>
        <CardLink href={`/clinicas/${clinica.id}`} label="Configurar" />
        <CardLink href={`/clinicas/${clinica.id}/conversaciones`} label="Conversaciones" />
        <CardLink href={`/clinicas/${clinica.id}/leads`} label="Leads" />
        {tieneAlerta && (
          <Link href={`/clinicas/${clinica.id}/conversaciones`} style={{
            fontSize: 12, fontWeight: 600,
            padding: "5px 12px", borderRadius: 6,
            background: "#fef9c3", color: "#92400e",
            border: "1px solid #fde68a",
            textDecoration: "none",
          }}>
            Ver alertas
          </Link>
        )}
      </div>
    </div>
  );
}

function CardLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{
      fontSize: 12, fontWeight: 500,
      padding: "5px 12px", borderRadius: 6,
      background: "#f8fafc", color: "#374151",
      border: "1px solid #e2e8f0",
      textDecoration: "none",
    }}>
      {label}
    </Link>
  );
}

function StatCell({ label, value, alert, border }: {
  label: string; value: number; alert?: boolean; border?: boolean;
}) {
  return (
    <div style={{
      padding: "12px 16px",
      borderLeft: border ? "1px solid #f1f5f9" : "none",
      background: alert ? "#fffbeb" : "transparent",
    }}>
      <div style={{
        fontSize: 22, fontWeight: 700,
        color: alert ? "#b45309" : "#0f172a",
        letterSpacing: "-0.03em",
        lineHeight: 1, marginBottom: 3,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function IntBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11.5, fontWeight: 500,
      padding: "3px 9px", borderRadius: 20,
      background: ok ? "#f0fdf4" : "#f8fafc",
      color: ok ? "#166534" : "#94a3b8",
      border: `1px solid ${ok ? "#bbf7d0" : "#e2e8f0"}`,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%",
        background: ok ? "#22c55e" : "#cbd5e1",
        flexShrink: 0,
      }} />
      {label}
    </span>
  );
}
