"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

type Step = 1 | 2 | 3;

type ClinicaData = {
  clinic_id: string;
  nombre: string;
  especialidad: string;
  url_web: string;
  telefono: string;
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
  const [extraidoOk, setExtraidoOk] = useState(false);

  // Step 1 fields
  const [nombre, setNombre] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [urlWeb, setUrlWeb] = useState("");
  const [telefono, setTelefono] = useState("");

  const trialDias = clinica
    ? Math.ceil(
        (new Date(clinica.trial_expires_at).getTime() - Date.now()) / 86_400_000
      )
    : 7;

  async function extraerConfig(clinicaData: ClinicaData) {
    if (!clinicaData.url_web?.trim()) {
      setStep(3);
      return;
    }
    try {
      const formData = new FormData();
      formData.append("url", clinicaData.url_web.trim());

      const res = await fetch(`/api/clinicas/${clinicaData.clinic_id}/configuracion/extraer`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Error al extraer configuración");
      const data = await res.json();

      const payload: Record<string, unknown> = {};
      if (data.prompt_generado) payload.prompt_personalizado = data.prompt_generado;
      if (data.servicios?.length) payload.servicios = data.servicios;
      if (data.horarios && Object.keys(data.horarios).length) payload.horarios = data.horarios;

      if (Object.keys(payload).length > 0) {
        await fetch(`/api/clinicas/${clinicaData.clinic_id}/configuracion/guardar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setExtraidoOk(true);
    } catch {
      // Extraction errors are non-blocking — user can do it later from Configuración
    } finally {
      setStep(3);
    }
  }

  async function crearClinica() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/clinicas/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, especialidad, url_web: urlWeb, telefono }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al crear la clínica");

      const nuevaClinica: ClinicaData = {
        clinic_id: data.clinic_id,
        nombre,
        especialidad,
        url_web: urlWeb,
        telefono,
        trial_expires_at: data.trial_expires_at,
      };
      setClinica(nuevaClinica);

      if (urlWeb.trim()) {
        setStep(2);
        await extraerConfig(nuevaClinica);
      } else {
        setStep(3);
      }
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
            {([1, 2, 3] as Step[]).map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: step >= s ? "#2563eb" : "#e5e7eb",
                  color: step >= s ? "white" : "#9ca3af",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                  transition: "all 0.2s",
                }}>
                  {step > s ? "✓" : s}
                </div>
                {i < 2 && (
                  <div style={{
                    width: 48, height: 2,
                    background: step > s ? "#2563eb" : "#e5e7eb",
                    transition: "background 0.3s",
                  }} />
                )}
              </div>
            ))}
          </div>
          <p style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>
            {step === 1 && "Tu clínica"}
            {step === 2 && "Analizando tu web"}
            {step === 3 && "¡Todo listo!"}
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

                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={labelStyle}>Web de la clínica</span>
                  <input
                    value={urlWeb}
                    onChange={e => setUrlWeb(e.target.value)}
                    placeholder="https://tuclinica.com"
                    type="url"
                    style={inputStyle}
                  />
                  <span style={{ fontSize: 11.5, color: "#9ca3af" }}>
                    La IA leerá toda tu web y configurará automáticamente los servicios y horarios.
                  </span>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={labelStyle}>Teléfono de contacto</span>
                  <input
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    placeholder="+34 612 345 678"
                    type="tel"
                    style={inputStyle}
                  />
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

          {/* ── STEP 2: Auto-scraping loading screen ── */}
          {step === 2 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              {/* Animated logo */}
              <div style={{
                width: 72, height: 72,
                background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                borderRadius: 20,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 24px",
                boxShadow: "0 8px 32px rgba(37,99,235,0.3)",
              }}>
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ animation: "pulse 2s ease-in-out infinite" }}>
                  <circle cx="18" cy="18" r="14" stroke="white" strokeWidth="2" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round" style={{ animation: "spin 2s linear infinite" }} />
                  <path d="M18 10v8l5 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 700, color: "#111827" }}>
                Analizando tu web...
              </h2>
              <p style={{ margin: "0 0 8px", fontSize: 14, color: "#6b7280", maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
                Estamos leyendo todas las páginas de <strong style={{ color: "#2563eb" }}>{urlWeb}</strong> para configurar tu recepcionista IA.
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                Esto puede tardar hasta 30 segundos...
              </p>

              {/* Progress dots */}
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 28 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: "#2563eb",
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>

              <div style={{
                marginTop: 28,
                background: "#f0f4ff",
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: 12.5,
                color: "#4f46e5",
                border: "1px solid #dbeafe",
              }}>
                Cuanto más completa sea tu web, mejor entrenará la IA a tu recepcionista.
              </div>
            </div>
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
                  Para activar todos los canales completa estos pasos desde el panel:
                </p>
                {[
                  { done: true, label: "Clínica creada" },
                  { done: extraidoOk, label: urlWeb ? "Agente entrenado con tu web" : "Añadir web → Configuración" },
                  { done: false, label: "Conectar Google Calendar → Configuración" },
                  { done: false, label: "Comprar número de teléfono → Canales" },
                ].map(({ done, label }) => (
                  <div key={label} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 0",
                    borderBottom: "1px solid #f0f0f0",
                  }}>
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
                    }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              <button onClick={() => router.push("/panel")} style={btnPrimary}>
                Ir al panel →
              </button>
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
