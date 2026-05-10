"use client";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

type Clinica = {
  id: string;
  nombre: string;
  telefono?: string;
  servicios?: any;
  horarios?: any;
  prompt_personalizado?: string;
};

type IAResult = {
  nombre_detectado?: string;
  resumen?: string;
  servicios?: Array<{ nombre: string; descripcion?: string; precio?: string }>;
  horarios?: Record<string, string>;
  ubicacion?: string;
  telefono?: string;
  web?: string;
  especialidades?: string[];
  faqs?: Array<{ pregunta: string; respuesta: string }>;
  tono?: string;
  prompt_generado?: string;
};

type Vista = "generar" | "info";

function getInitialDoc(clinica: Clinica): string {
  // New format: servicios._doc
  const s = clinica.servicios;
  if (s && !Array.isArray(s) && typeof s === "object" && s._doc) {
    return s._doc as string;
  }
  // Old format: build from structured data
  const parts: string[] = [];
  if (Array.isArray(s) && s.length > 0) {
    parts.push("Servicios:");
    s.forEach((sv: any) => {
      let line = `- ${sv.nombre}`;
      if (sv.duracion_min) line += ` (${sv.duracion_min} min)`;
      if (sv.precio_orientativo) line += `, ${sv.precio_orientativo}€`;
      parts.push(line);
    });
  }
  if (clinica.horarios && Object.keys(clinica.horarios).length > 0) {
    parts.push("\nHorarios:");
    Object.entries(clinica.horarios).forEach(([dia, h]: [string, any]) => {
      if (typeof h === "string" && h) parts.push(`- ${dia}: ${h}`);
      else if (h?.start && h?.end) parts.push(`- ${dia}: ${h.start}–${h.end}`);
    });
  }
  return parts.join("\n");
}

function iaResultToDoc(ia: IAResult, nombre: string): string {
  const lines: string[] = [];
  if (nombre) lines.push(`Clínica: ${nombre}`);
  if (ia.resumen) lines.push(`\n${ia.resumen}`);
  if (ia.ubicacion) lines.push(`\nUbicación: ${ia.ubicacion}`);
  if (ia.telefono) lines.push(`Teléfono: ${ia.telefono}`);
  if (ia.web) lines.push(`Web: ${ia.web}`);
  if (ia.tono) lines.push(`Tono: ${ia.tono}`);
  if (ia.especialidades?.length) {
    lines.push(`\nEspecialidades:`);
    ia.especialidades.forEach(e => lines.push(`- ${e}`));
  }
  if (ia.servicios?.length) {
    lines.push(`\nServicios:`);
    ia.servicios.forEach(s => {
      let line = `- ${s.nombre}`;
      if (s.precio) line += ` (${s.precio})`;
      if (s.descripcion) line += `: ${s.descripcion}`;
      lines.push(line);
    });
  }
  if (ia.horarios && Object.keys(ia.horarios).length > 0) {
    lines.push(`\nHorarios:`);
    Object.entries(ia.horarios).forEach(([dia, h]) => lines.push(`- ${dia}: ${h}`));
  }
  if (ia.faqs?.length) {
    lines.push(`\nPreguntas frecuentes:`);
    ia.faqs.forEach(f => lines.push(`- ${f.pregunta}\n  ${f.respuesta}`));
  }
  return lines.join("\n");
}

function generarPromptDesdeDoc(nombre: string, doc: string): string {
  return `Eres la recepcionista virtual de ${nombre}. Responde siempre en español, con un tono amigable y profesional.

INFORMACIÓN VERIFICADA DE LA CLÍNICA:
${doc}

INSTRUCCIONES:
- Si el paciente quiere agendar una cita, usa las herramientas disponibles para consultar disponibilidad y crear la cita.
- Si no sabes algo con certeza, dilo claramente y ofrece derivar a un humano.
- Nunca inventes precios, horarios ni servicios que no estén en la información proporcionada.
- Cuando detectes interés real en agendar, pide nombre, teléfono, servicio y fecha preferida.`;
}

export default function ConfiguracionForm({
  clinica,
  clinicId,
}: {
  clinica: Clinica;
  clinicId: string;
}) {
  const initialDoc = getInitialDoc(clinica);
  const [vista, setVista] = useState<Vista>(initialDoc ? "info" : "generar");
  const [doc, setDoc] = useState(initialDoc);
  const [prompt, setPrompt] = useState(clinica.prompt_personalizado || "");
  const [editarPrompt, setEditarPrompt] = useState(false);
  const [mostrarAvanzado, setMostrarAvanzado] = useState(false);
  const [url, setUrl] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedDocRef = useRef(initialDoc);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const generarConIA = async () => {
    if (!url.trim() && archivos.length === 0) {
      setError("Pega la URL de tu clínica o sube al menos un documento.");
      return;
    }
    setProcesando(true);
    setError("");
    const form = new FormData();
    if (url.trim()) form.append("url", url.trim());
    archivos.forEach(f => form.append("archivos", f));
    try {
      const res = await fetch(`/api/clinicas/${clinicId}/configuracion/extraer`, {
        method: "POST", body: form,
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Error del servidor");
      const data: IAResult = await res.json();
      const newDoc = iaResultToDoc(data, clinica.nombre);
      setDoc(newDoc);
      savedDocRef.current = newDoc;
      setIsDirty(false);
      if (!editarPrompt) setPrompt(generarPromptDesdeDoc(clinica.nombre, newDoc));
      setVista("info");
    } catch (e: any) {
      setError(e.message || "Error generando configuración");
    } finally {
      setProcesando(false);
    }
  };

  const guardar = async () => {
    setGuardando(true);
    setGuardado(false);
    setError("");
    const promptFinal = editarPrompt ? prompt : generarPromptDesdeDoc(clinica.nombre, doc);
    try {
      const res = await fetch(`/api/clinicas/${clinicId}/configuracion/guardar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_personalizado: promptFinal,
          servicios: { _doc: doc },
          horarios: clinica.horarios || {},
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      if (!editarPrompt) setPrompt(promptFinal);
      savedDocRef.current = doc;
      setIsDirty(false);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } catch (e: any) {
      setError(e.message || "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ maxWidth: 820 }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 24, margin: "0 0 4px", fontWeight: 800, color: "#111827", letterSpacing: "-0.03em" }}>
            Configuración del agente
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: "#6b7280" }}>
            Define la información y comportamiento de tu recepcionista IA.
          </p>
        </div>
      </div>

      {/* Tab pills */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f3f4f6", borderRadius: 10, padding: 3, width: "fit-content" }}>
        {([["generar", "Generar con IA"], ["info", "Información del bot"]] as [Vista, string][]).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setVista(v)}
            style={{
              padding: "7px 16px", borderRadius: 7, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: vista === v ? 600 : 500,
              background: vista === v ? "white" : "transparent",
              color: vista === v ? "#111827" : "#6b7280",
              boxShadow: vista === v ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.12s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ── Generar con IA ── */}
      {vista === "generar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <div style={{ padding: "13px 16px", borderBottom: "1px solid #f3f4f6", fontSize: 13.5, fontWeight: 700, color: "#111827" }}>
              Web de la clínica
            </div>
            <div style={{ padding: 16 }}>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://miclinica.com"
                style={inputSt}
              />
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "8px 0 0" }}>
                La IA analizará la web y extraerá servicios, horarios, precios y toda la información relevante.
              </p>
            </div>
          </div>

          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            <div style={{ padding: "13px 16px", borderBottom: "1px solid #f3f4f6", fontSize: 13.5, fontWeight: 700, color: "#111827" }}>
              Documentos adicionales
              <span style={{ fontSize: 11, fontWeight: 400, color: "#9ca3af", marginLeft: 8 }}>PDF, DOCX, TXT, CSV, XLSX</span>
            </div>
            <div style={{ padding: 16 }}>
              <div
                onDrop={e => { e.preventDefault(); setArchivos(p => [...p, ...Array.from(e.dataTransfer.files)]); }}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: "2px dashed #e5e7eb", borderRadius: 10, padding: "24px 20px",
                  textAlign: "center", cursor: "pointer",
                  transition: "border-color 0.1s",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ margin: "0 auto", display: "block" }}>
                    <path d="M26 21v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4M21 11l-5-5-5 5M16 6v16" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ fontSize: 14, color: "#374151", marginBottom: 4 }}>Arrastra archivos o haz clic para seleccionar</div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>Tarifas, menú de servicios, horarios, FAQs…</div>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt,.csv,.xlsx,.md"
                  style={{ display: "none" }}
                  onChange={e => setArchivos(p => [...p, ...Array.from(e.target.files || [])])}
                />
              </div>
              {archivos.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {archivos.map((f, i) => (
                    <span key={i} style={{
                      background: "#f3f4f6", borderRadius: 20, padding: "4px 10px",
                      fontSize: 12, color: "#374151", display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {f.name}
                      <button onClick={() => setArchivos(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={generarConIA}
            disabled={procesando || (!url.trim() && archivos.length === 0)}
            style={{
              background: procesando ? "#9ca3af" : "#111827",
              color: "white", border: "none", borderRadius: 10,
              padding: "12px 20px", fontSize: 14, fontWeight: 600,
              cursor: procesando ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 8, width: "fit-content",
            }}
          >
            {procesando ? (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round" />
                </svg>
                Analizando con IA…
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M7.5 1.5L8.8 4.5H11.5L9.3 6.3L10.1 9.5L7.5 7.8L4.9 9.5L5.7 6.3L3.5 4.5H6.2L7.5 1.5Z" stroke="white" strokeWidth="1.1" strokeLinejoin="round"/>
                </svg>
                Analizar y generar información
              </>
            )}
          </button>
        </div>
      )}

      {/* ── Información del bot ── */}
      {vista === "info" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            {/* Toolbar */}
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid #f3f4f6",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: 8 }}>
                  Información del bot
                  {isDirty && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: "#b45309",
                      background: "#fffbeb", border: "1px solid #fde68a",
                      borderRadius: 6, padding: "2px 7px",
                    }}>
                      Cambios sin guardar
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 2 }}>
                  Edita libremente. Al guardar se regenera el system prompt automáticamente.
                </div>
              </div>
              {/* Three dots */}
              <button
                onClick={() => setMostrarAvanzado(p => !p)}
                title="Opciones avanzadas"
                style={{
                  background: mostrarAvanzado ? "#f3f4f6" : "transparent",
                  border: "1px solid #e5e7eb",
                  borderRadius: 7, padding: "5px 10px",
                  cursor: "pointer", fontSize: 16, color: "#6b7280",
                  display: "flex", alignItems: "center", gap: 4,
                  fontWeight: 700, letterSpacing: 2,
                }}
              >
                ···
              </button>
            </div>

            <div style={{ padding: 16 }}>
              <textarea
                value={doc}
                onChange={e => { setDoc(e.target.value); setIsDirty(e.target.value !== savedDocRef.current); }}
                rows={18}
                placeholder={"Clínica: Nombre de la clínica\n\nResumen: Descripción de la clínica...\n\nServicios:\n- Limpieza dental (60 min, 80€)\n- Ortodoncia...\n\nHorarios:\n- Lunes a viernes: 9:00–20:00\n- Sábados: 10:00–14:00\n\nTeléfono: +34 600 000 000"}
                style={{
                  ...inputSt,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 13,
                  lineHeight: 1.7,
                  minHeight: 360,
                  resize: "vertical",
                }}
              />
            </div>

            {/* Avanzado: system prompt */}
            {mostrarAvanzado && (
              <div style={{ borderTop: "1px solid #f3f4f6", padding: 16, background: "#fafafa" }}>
                <div style={{
                  background: "#fef9c3", border: "1px solid #fde047",
                  borderRadius: 8, padding: "10px 14px", fontSize: 12.5,
                  color: "#713f12", marginBottom: 12,
                  display: "flex", gap: 8, alignItems: "flex-start",
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                    <path d="M8 6v3M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  <span>
                    <strong>Recomendamos no modificar el system prompt directamente.</strong> Si lo editas manualmente puede quedar desactualizado respecto a la información del bot. Los cambios en "Información del bot" no actualizarán el prompt si está en modo manual.
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>System prompt</span>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editarPrompt}
                      onChange={e => setEditarPrompt(e.target.checked)}
                    />
                    Editar manualmente
                  </label>
                </div>

                <textarea
                  value={editarPrompt ? prompt : generarPromptDesdeDoc(clinica.nombre, doc)}
                  onChange={e => setPrompt(e.target.value)}
                  disabled={!editarPrompt}
                  rows={14}
                  style={{
                    ...inputSt,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 12,
                    lineHeight: 1.65,
                    background: editarPrompt ? "white" : "#f9fafb",
                    color: editarPrompt ? "#111827" : "#6b7280",
                    resize: "vertical",
                  }}
                />
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                  {(editarPrompt ? prompt : generarPromptDesdeDoc(clinica.nombre, doc)).length} caracteres
                </div>
              </div>
            )}
          </div>

          {/* Save button */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={guardar}
              disabled={guardando}
              style={{
                background: guardado ? "#dcfce7" : "#111827",
                color: guardado ? "#166534" : "white",
                border: guardado ? "1px solid #86efac" : "none",
                borderRadius: 10, padding: "10px 22px",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 7,
              }}
            >
              {guardado ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="#166534" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Guardado
                </>
              ) : guardando ? "Guardando…" : "Guardar configuración"}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const inputSt: CSSProperties = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "9px 11px",
  fontSize: 13.5,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  color: "#111827",
};
