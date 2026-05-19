"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

type Step = 1 | 3;

type ClinicaData = {
  clinic_id: string;
  nombre: string;
  especialidad: string;
  trial_expires_at: string;
};

const ESPECIALIDADES = [
  "Clínica dental",
  "Clínica estética",
  "Fisioterapia y rehabilitación",
  "Psicología",
  "Medicina general",
  "Oftalmología",
  "Dermatología",
  "Otro",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [clinica, setClinica] = useState<ClinicaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 fields
  const [nombre, setNombre] = useState("");
  const [especialidad, setEspecialidad] = useState("");

  const trialDias = clinica
    ? Math.ceil(
        (new Date(clinica.trial_expires_at).getTime() - Date.now()) / 86_400_000
      )
    : 7;

  async function crearClinica() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/clinicas/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, especialidad }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al crear la clínica");

      setClinica({
        clinic_id: data.clinic_id,
        nombre,
        especialidad,
        trial_expires_at: data.trial_expires_at,
      });
      setStep(3);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f0f4ff 0%, #fafafa 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36,
              background: "linear-gradient(135deg, #2563eb, #4f46e5)",
              borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>A</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 17, color: "#111827" }}>Atiende360</span>
          </div>

          {/* Steps indicator */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0 }}>
            {[1, 2].map((s, i) => {
              const realStep = s === 1 ? 1 : 3;
              const active = step >= realStep;
              const done = step > realStep;
              return (
                <div key={s} style={{ display: "flex", alignItems: "center" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: active ? "#2563eb" : "#e5e7eb",
                    color: active ? "white" : "#9ca3af",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                    transition: "all 0.2s",
                  }}>
                    {done ? "✓" : s}
                  </div>
                  {i < 1 && (
                    <div style={{
                      width: 48, height: 2,
                      background: done ? "#2563eb" : "#e5e7eb",
                      transition: "background 0.3s",
                    }} />
                  )}
                </div>
              );
            })}
          </div>
          <p style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>
            {step === 1 && "Tu clínica"}
            {step === 3 && "¡Lista para configurar!"}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "white",
          borderRadius: 20,
          padding: "40px 36px",
          boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
        }}>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <>
              <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#111827" }}>
                Cuéntanos sobre tu clínica
              </h1>
              <p style={{ margin: "0 0 28px", color: "#6b7280", fontSize: 14 }}>
                Con esto configuramos tu recepcionista IA desde el primer día.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={labelStyle}>Nombre de la clínica *</span>
                  <input
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Ej: Clínica Dental Martínez"
                    style={inputStyle}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={labelStyle}>Especialidad *</span>
                  <select
                    value={especialidad}
                    onChange={e => setEspecialidad(e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="">Selecciona una especialidad</option>
                    {ESPECIALIDADES.map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </label>

              </div>

              {error && <p style={errorStyle}>{error}</p>}

              <button
                onClick={crearClinica}
                disabled={loading || !nombre || !especialidad}
                style={{
                  ...btnPrimary,
                  marginTop: 28,
                  opacity: loading || !nombre || !especialidad ? 0.6 : 1,
                }}
              >
                {loading ? "Creando clínica…" : "Continuar →"}
              </button>
            </>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && clinica && (
            <>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
                <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 700, color: "#111827" }}>
                  ¡{clinica.nombre} está lista!
                </h1>
                <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
                  Tu recepcionista IA ya está configurada. Tienes{" "}
                  <strong style={{ color: "#2563eb" }}>{trialDias} días de prueba gratuita</strong>{" "}
                  para probarla sin compromiso.
                </p>
              </div>

              {/* Checklist */}
              <div style={{
                background: "#f9fafb",
                borderRadius: 14,
                padding: "20px 20px",
                marginBottom: 24,
              }}>
                <p style={{ margin: "0 0 14px", fontWeight: 600, fontSize: 13, color: "#374151" }}>
                  El asistente te guiará paso a paso dentro del panel:
                </p>
                {[
                  { done: true, label: "Clínica creada", href: null },
                  { done: false, label: "Configurar agente IA", href: "/panel/configuracion" },
                  { done: false, label: "Conectar Google Calendar", href: "/panel/configuracion" },
                  { done: false, label: "Activar canales (teléfono / WhatsApp)", href: "/panel/canales" },
                ].map(({ done, label, href }) => (
                  <div
                    key={label}
                    onClick={() => href && router.push(href)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 6px",
                      borderBottom: "1px solid #f0f0f0",
                      borderRadius: 6,
                      cursor: href ? "pointer" : "default",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { if (href) (e.currentTarget as HTMLDivElement).style.background = "#f0f4ff"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                  >
                    <span style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: done ? "#dcfce7" : "#f3f4f6",
                      color: done ? "#166534" : "#9ca3af",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}>
                      {done ? "✓" : "○"}
                    </span>
                    <span style={{
                      fontSize: 13,
                      color: done ? "#166534" : "#374151",
                      fontWeight: done ? 500 : 400,
                      flex: 1,
                    }}>
                      {label}
                    </span>
                    {href && !done && (
                      <span style={{ fontSize: 12, color: "#2563eb", fontWeight: 600 }}>→</span>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={() => router.push("/panel")} style={btnPrimary}>
                  Ir al panel — el asistente te guía →
                </button>
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#9ca3af" }}>
          Sin permanencia. Cancela cuando quieras.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

const labelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
};

const inputStyle: CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  color: "#111827",
  background: "white",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const btnPrimary: CSSProperties = {
  background: "linear-gradient(135deg, #2563eb, #4f46e5)",
  color: "white",
  border: "none",
  borderRadius: 10,
  padding: "13px 24px",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%",
};

const errorStyle: CSSProperties = {
  marginTop: 10,
  padding: "10px 14px",
  background: "#fef2f2",
  border: "1px solid #fca5a5",
  borderRadius: 8,
  fontSize: 13,
  color: "#991b1b",
};
