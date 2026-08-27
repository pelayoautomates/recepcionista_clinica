"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Alta de clínica en dos pasos, pensada para hacerla con el cliente delante:
 * se crea la clínica y se le entrega el enlace con el que entra a su panel.
 *
 * El enlace de invitación es el paso que faltaba: sin él la clínica queda creada
 * pero nadie puede acceder a ella.
 */

const ESPECIALIDADES = [
  "Medicina estética",
  "Fisioterapia",
  "Psicología",
  "Clínica dental",
  "Nutrición",
  "Podología",
  "Otra",
];

type Creada = { clinic_id: string; nombre: string };

export default function NuevaClinicaForm() {
  const [nombre, setNombre] = useState("");
  const [especialidad, setEspecialidad] = useState(ESPECIALIDADES[0]);
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [urlWeb, setUrlWeb] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creada, setCreada] = useState<Creada | null>(null);

  const [invitacion, setInvitacion] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;

    setGuardando(true);
    setError(null);
    try {
      const res = await fetch("/api/clinicas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          especialidad,
          email_contacto: email.trim() || null,
          telefono: telefono.trim() || null,
          url_web: urlWeb.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.detail || "No se pudo crear la clínica.");
        return;
      }
      setCreada({ clinic_id: data.id, nombre: nombre.trim() });
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  async function generarInvitacion() {
    if (!creada) return;
    setGenerando(true);
    setError(null);
    try {
      const res = await fetch(`/api/clinicas/${creada.clinic_id}/invitacion`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.token) {
        setError(data?.detail || "No se pudo generar el enlace de acceso.");
        return;
      }
      setInvitacion(`${window.location.origin}/login?token=${data.token}`);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setGenerando(false);
    }
  }

  async function copiar() {
    if (!invitacion) return;
    try {
      await navigator.clipboard.writeText(invitacion);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError("El navegador no permitió copiar. Selecciona el enlace a mano.");
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <Link href="/agencia" style={{ color: "#64748b", fontSize: 13, textDecoration: "none" }}>
        ← Volver al panel de agencia
      </Link>

      <h1 style={{ margin: "16px 0 6px", fontSize: 27, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
        {creada ? "Clínica creada" : "Nueva clínica"}
      </h1>
      <p style={{ margin: "0 0 28px", color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
        {creada
          ? "Ya existe en el sistema. Ahora genera el enlace con el que la clínica entra a su panel."
          : "Solo hacen falta el nombre y la especialidad. El resto se puede completar después desde su panel."}
      </p>

      {error && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b",
          borderRadius: 10, padding: "12px 14px", fontSize: 13.5, marginBottom: 20, lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      {!creada ? (
        <form onSubmit={crear} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Campo label="Nombre de la clínica" requerido>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Clínica Estética Luna"
              required
              autoFocus
              style={inputStyle}
            />
          </Campo>

          <Campo label="Especialidad">
            <select value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} style={inputStyle}>
              {ESPECIALIDADES.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </Campo>

          <Campo label="Email de contacto">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="info@clinicaluna.es" style={inputStyle} />
          </Campo>

          <Campo label="Teléfono de la clínica" ayuda="El que ya tienen y aparece en su web. No se cambia.">
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)}
              placeholder="+34 910 00 00 00" style={inputStyle} />
          </Campo>

          <Campo label="Web" ayuda="Si la tiene, el agente puede aprender de ella al configurarlo.">
            <input value={urlWeb} onChange={(e) => setUrlWeb(e.target.value)}
              placeholder="https://clinicaluna.es" style={inputStyle} />
          </Campo>

          <button type="submit" disabled={guardando || !nombre.trim()} style={{
            ...botonStyle,
            background: guardando || !nombre.trim() ? "#94a3b8" : "#1a1a2e",
            cursor: guardando || !nombre.trim() ? "default" : "pointer",
            marginTop: 8,
          }}>
            {guardando ? "Creando…" : "Crear clínica"}
          </button>
        </form>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{
            background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12,
            padding: "16px 18px", fontSize: 14, color: "#166534", lineHeight: 1.6,
          }}>
            <strong>{creada.nombre}</strong> ya está creada.
          </div>

          {!invitacion ? (
            <>
              <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                El enlace es de un solo uso por clínica: quien lo abra con su cuenta de Google
                quedará vinculado como usuario de esta clínica.
              </p>
              <button type="button" onClick={generarInvitacion} disabled={generando} style={{
                ...botonStyle,
                background: generando ? "#94a3b8" : "#166634",
                cursor: generando ? "default" : "pointer",
              }}>
                {generando ? "Generando…" : "Generar enlace de acceso"}
              </button>
            </>
          ) : (
            <>
              <Campo label="Enlace de acceso para la clínica">
                <input readOnly value={invitacion} onFocus={(e) => e.target.select()}
                  style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12.5 }} />
              </Campo>
              <button type="button" onClick={copiar} style={{ ...botonStyle, background: "#166634" }}>
                {copiado ? "Copiado ✓" : "Copiar enlace"}
              </button>
              <div style={{
                background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12,
                padding: "14px 16px", fontSize: 13.5, color: "#92400e", lineHeight: 1.65,
              }}>
                <strong>Antes de dejarla sola:</strong> entra con ella a su panel y carga sus
                servicios y profesionales. Sin eso el agente no puede dar ni una cita —
                el checklist del panel te lo va marcando.
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <Link href="/agencia" style={{
              ...botonStyle, background: "white", color: "#0f172a",
              border: "1px solid #e2e8f0", textDecoration: "none", textAlign: "center", flex: 1,
            }}>
              Ir al panel de agencia
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({ label, ayuda, requerido, children }: {
  label: string; ayuda?: string; requerido?: boolean; children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
        {label}{requerido && <span style={{ color: "#dc2626" }}> *</span>}
      </span>
      {children}
      {ayuda && <span style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{ayuda}</span>}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "11px 13px",
  borderRadius: 9,
  border: "1px solid #e2e8f0",
  fontSize: 14,
  color: "#0f172a",
  background: "white",
  width: "100%",
  boxSizing: "border-box",
};

const botonStyle: React.CSSProperties = {
  padding: "12px 20px",
  borderRadius: 10,
  border: "none",
  color: "white",
  fontSize: 14.5,
  fontWeight: 700,
  cursor: "pointer",
};
