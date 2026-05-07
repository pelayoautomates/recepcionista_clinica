import Link from "next/link";
import GoogleCalendarButton from "./GoogleCalendarButton";
import EditClinicaForm from "./EditClinicaForm";
import InvitacionButton from "./InvitacionButton";
import { GoogleCalendarLogo, WhatsAppLogo } from "@/components/BrandLogos";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";
const PUBLIC_BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

async function getClinica(id: string) {
  const res = await fetch(`${BACKEND}/admin/clinicas/${id}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function getMetricas(id: string) {
  const res = await fetch(`${BACKEND}/admin/clinicas/${id}/metricas`, { cache: "no-store" });
  if (!res.ok) return { leads_hoy: 0, citas_hoy: 0, conversaciones_esperando_humano: 0 };
  return res.json();
}

export default async function ClinicaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [clinica, metricas] = await Promise.all([
    getClinica(id),
    getMetricas(id),
  ]);

  if (!clinica) {
    return <div style={{ padding: 32, color: "#ef4444" }}>Cliente no encontrado</div>;
  }

  const googleAuthUrl = `${PUBLIC_BACKEND}/auth/google/${id}`;
  const tieneCalendario = !!clinica.google_tokens_enc;

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 24 }}>
        <div>
          <Link href="/" style={{ fontSize: 13, color: "#6b7280", textDecoration: "none" }}>← Todos los clientes</Link>
          <h1 style={{ margin: "4px 0 0", fontSize: 24 }}>{clinica.nombre}</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { href: `/clinicas/${id}/leads`, label: "Leads" },
            { href: `/clinicas/${id}/conversaciones`, label: "Conversaciones" },
            { href: `/clinicas/${id}/citas`, label: "Citas" },
            { href: `/clinicas/${id}/jobs`, label: "Jobs" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{
              fontSize: 13, color: "#374151", textDecoration: "none",
              border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 12px",
              background: "white",
            }}>{label}</Link>
          ))}
        </div>
      </div>

      {/* Métricas */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Leads hoy", value: metricas.leads_hoy },
          { label: "Citas hoy", value: metricas.citas_hoy },
          { label: "Esperando humano", value: metricas.conversaciones_esperando_humano, alert: metricas.conversaciones_esperando_humano > 0 },
        ].map(({ label, value, alert }) => (
          <div key={label} style={{
            background: alert ? "#fef3c7" : "white",
            border: `1px solid ${alert ? "#f59e0b" : "#e5e7eb"}`,
            borderRadius: 8, padding: "12px 20px", flex: 1,
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: alert ? "#92400e" : "#111" }}>{value}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Google Calendar */}
        <div style={{ background: "white", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <GoogleCalendarLogo /> Google Calendar
          </h2>
          {tieneCalendario ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <GoogleCalendarLogo />
              <span style={{ fontSize: 14, color: "#166534" }}>Conectado</span>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px" }}>
                Manda este enlace al cliente para que conecte su Google Calendar.
                Solo necesitan hacer click, iniciar sesión y aceptar.
              </p>
              <div style={{
                background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6,
                padding: "8px 10px", fontSize: 12, color: "#374151",
                wordBreak: "break-all", marginBottom: 10, fontFamily: "monospace",
              }}>
                {googleAuthUrl}
              </div>
              <GoogleCalendarButton url={googleAuthUrl} />
            </div>
          )}
        </div>

        {/* WhatsApp */}
        <div style={{ background: "white", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <WhatsAppLogo /> WhatsApp
          </h2>
          {clinica.whatsapp_number ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <WhatsAppLogo />
                <span style={{ fontSize: 14, color: "#166534" }}>Configurado</span>
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>
                Phone ID: {clinica.whatsapp_number}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              Sin configurar. Edita el cliente para añadir el Phone Number ID de Meta.
            </div>
          )}
        </div>

        {/* Servicios */}
        <div style={{ background: "white", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>Servicios</h2>
          {clinica.servicios?.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {clinica.servicios.map((s: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>{s.nombre}</span>
                  <span style={{ color: "#6b7280" }}>
                    {s.duracion_min} min{s.precio_orientativo ? ` · ${s.precio_orientativo}€` : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 13, color: "#9ca3af" }}>Sin servicios configurados</span>
          )}
        </div>

        {/* Horarios */}
        <div style={{ background: "white", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>Horario</h2>
          {Object.keys(clinica.horarios || {}).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {Object.entries(clinica.horarios).map(([dia, h]: [string, any]) => (
                <div key={dia} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ textTransform: "capitalize", color: "#374151" }}>{dia}</span>
                  <span style={{ color: "#6b7280" }}>{h.start} — {h.end}</span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 13, color: "#9ca3af" }}>Sin horario configurado</span>
          )}
        </div>
      </div>

      {/* Acceso del cliente */}
      <div style={{ background: "white", borderRadius: 8, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginTop: 16 }}>
        <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>Acceso del cliente</h2>
        <InvitacionButton clinicId={id} />
      </div>

      {/* Formulario de edición */}
      <div style={{ marginTop: 16 }}>
        <EditClinicaForm clinica={clinica} backendUrl={PUBLIC_BACKEND} />
      </div>
    </div>
  );
}
