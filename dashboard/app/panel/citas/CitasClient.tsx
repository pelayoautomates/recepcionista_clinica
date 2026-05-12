"use client";
import { useState } from "react";

const ESTADO_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  confirmada:  { label: "Confirmada",  bg: "#dcfce7", color: "#166534" },
  cancelada:   { label: "Cancelada",   bg: "#fee2e2", color: "#991b1b" },
  completada:  { label: "Completada",  bg: "#f1f5f9", color: "#64748b" },
  no_asistio:  { label: "No asistió",  bg: "#fef3c7", color: "#92400e" },
  pendiente:   { label: "Pendiente",   bg: "#fef9c3", color: "#854d0e" },
};

const CANAL_LABEL: Record<string, string> = {
  chat_web: "Chat web", whatsapp: "WhatsApp", voz: "Llamada",
};

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function CitasClient({ citas, fechaLabel, clinicId, tieneGcal }: { citas: any[]; fechaLabel: string; clinicId: string; tieneGcal: boolean }) {
  const [selected, setSelected] = useState<any | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  async function syncGcal() {
    setSyncing(true); setSyncMsg("");
    try {
      const res = await fetch(`/api/clinicas/${clinicId}/citas/sync-gcal`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error");
      setSyncMsg(`✓ ${data.importados} importadas, ${data.actualizados} actualizadas`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) { setSyncMsg(`Error: ${e.message}`); }
    finally { setSyncing(false); }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em" }}>
            Citas
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: "#6b7280" }}>Hoy — {fechaLabel}</p>
        </div>
        {tieneGcal && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <button
              onClick={syncGcal}
              disabled={syncing}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                background: "white", border: "1px solid #e5e7eb",
                borderRadius: 8, padding: "8px 14px", fontSize: 13,
                fontWeight: 600, color: "#374151", cursor: syncing ? "wait" : "pointer",
                opacity: syncing ? 0.7 : 1,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M12 7A5 5 0 1 1 7 2M7 2l2-2M7 2L5 0" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {syncing ? "Sincronizando…" : "Sincronizar Google Calendar"}
            </button>
            {syncMsg && <span style={{ fontSize: 12, color: syncMsg.startsWith("✓") ? "#166534" : "#dc2626" }}>{syncMsg}</span>}
          </div>
        )}
      </div>

      {citas.length === 0 ? (
        <div style={{
          background: "white", borderRadius: 12, padding: 60,
          textAlign: "center", color: "#9ca3af", fontSize: 13.5,
          border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
        }}>
          No hay citas para hoy
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {citas.map((cita: any) => {
            const est = ESTADO_CONFIG[cita.estado] || ESTADO_CONFIG.confirmada;
            const horaInicio = cita.fecha_inicio ? fmtHora(cita.fecha_inicio) : "—";
            const horaFin = cita.fecha_fin ? fmtHora(cita.fecha_fin) : "";
            const paciente = cita.pacientes;

            return (
              <div
                key={cita.id}
                onClick={() => setSelected(cita)}
                style={{
                  background: "white", borderRadius: 12,
                  padding: "16px 20px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  cursor: "pointer",
                  transition: "box-shadow 0.1s, border-color 0.1s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#bfdbfe";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(37,99,235,0.08)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#e5e7eb";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(15,23,42,0.04)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {/* Time block */}
                  <div style={{
                    width: 54, textAlign: "center",
                    background: "#f9fafb", borderRadius: 8, padding: "7px 6px",
                    flexShrink: 0,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{horaInicio}</div>
                    {horaFin && <div style={{ fontSize: 11, color: "#9ca3af" }}>{horaFin}</div>}
                  </div>

                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                      {cita.tipo_servicio || "Cita"}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>
                      {paciente?.nombre || "Paciente desconocido"}
                      {paciente?.telefono && <span style={{ color: "#9ca3af" }}> · {paciente.telefono}</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    fontSize: 11.5, fontWeight: 600,
                    background: est.bg, color: est.color,
                    padding: "3px 10px", borderRadius: 20,
                  }}>
                    {est.label}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3L9 7L5 11" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <ModalDetalleCita cita={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function ModalDetalleCita({ cita, onClose }: { cita: any; onClose: () => void }) {
  const est = ESTADO_CONFIG[cita.estado] || ESTADO_CONFIG.confirmada;
  const paciente = cita.pacientes;
  const start = cita.fecha_inicio ? new Date(cita.fecha_inicio) : null;
  const end = cita.fecha_fin ? new Date(cita.fecha_fin) : null;
  const durMin = start && end ? Math.round((end.getTime() - start.getTime()) / 60000) : null;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div style={{
        background: "white", borderRadius: 16, padding: 28, width: 440,
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "#111827" }}>
              {cita.tipo_servicio || "Cita"}
            </h3>
            <span style={{
              fontSize: 12, fontWeight: 600,
              background: est.bg, color: est.color,
              padding: "3px 10px", borderRadius: 20,
            }}>
              {est.label}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f3f4f6", border: "none", cursor: "pointer",
              width: 28, height: 28, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#6b7280", fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>

        {/* Patient section */}
        <div style={{
          background: "#f9fafb", borderRadius: 10,
          padding: "14px 16px", marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Paciente
          </div>
          <ModalRow
            icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M2 11.5C2 9.29 4.24 7.5 7 7.5C9.76 7.5 12 9.29 12 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
            label="Nombre"
            value={paciente?.nombre || "Desconocido"}
          />
          <ModalRow
            icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2.5C2 2.22 2.22 2 2.5 2H4.1L5 4.5L4 5C4.5 6.2 5.3 6.9 6.5 7.4L7 6.5L9.5 7.4V9C9.5 9.28 9.28 9.5 9 9.5C5.69 9.5 3 6.81 3 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
            label="Teléfono"
            value={paciente?.telefono || "—"}
          />
        </div>

        {/* Appointment details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Detalles de la cita
          </div>
          {start && (
            <>
              <ModalRow
                icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 5.5H12.5M4.5 1V3.5M9.5 1V3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
                label="Fecha"
                value={fmtFecha(cita.fecha_inicio)}
              />
              <ModalRow
                icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4.5V7.5L9 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
                label="Hora"
                value={end ? `${fmtHora(cita.fecha_inicio)} — ${fmtHora(cita.fecha_fin)}` : fmtHora(cita.fecha_inicio)}
              />
            </>
          )}
          {durMin && (
            <ModalRow
              icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2.5V7L9.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/></svg>}
              label="Duración"
              value={`${durMin} min`}
            />
          )}
          {cita.canal && (
            <ModalRow
              icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 1.5H2C1.72 1.5 1.5 1.72 1.5 2V9C1.5 9.28 1.72 9.5 2 9.5H4V12L7 9.5H12C12.28 9.5 12.5 9.28 12.5 9V2C12.5 1.72 12.28 1.5 12 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>}
              label="Agendada por"
              value={CANAL_LABEL[cita.canal] || cita.canal}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ModalRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
      <span style={{ color: "#9ca3af", flexShrink: 0 }}>{icon}</span>
      <span style={{ color: "#6b7280", minWidth: 90 }}>{label}</span>
      <span style={{ color: "#111827", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
