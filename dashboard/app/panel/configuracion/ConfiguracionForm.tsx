"use client";
import { useState, useRef } from "react";

type Clinica = {
  id: string;
  nombre: string;
  telefono?: string;
  email_contacto?: string;
  horarios?: Record<string, string>;
  servicios?: Array<{ nombre: string; duracion_min?: number; precio?: string }>;
  prompt_personalizado?: string;
  google_tokens_enc?: boolean;
  whatsapp_number?: string;
};

type IAResult = {
  nombre_detectado?: string;
  resumen?: string;
  servicios?: Array<{ nombre: string; descripcion?: string; precio?: string }>;
  horarios?: Record<string, string>;
  ubicacion?: string;
  telefono?: string;
  especialidades?: string[];
  faqs?: Array<{ pregunta: string; respuesta: string }>;
  tono?: string;
  prompt_generado?: string;
};

type Tab = "ia" | "prompt" | "servicios";

export default function ConfiguracionForm({
  clinica: initial,
  clinicId,
  backendUrl,
}: {
  clinica: Clinica;
  clinicId: string;
  backendUrl: string;
}) {
  const [tab, setTab] = useState<Tab>("ia");
  const [url, setUrl] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [iaResult, setIaResult] = useState<IAResult | null>(null);
  const [prompt, setPrompt] = useState(initial.prompt_personalizado || "");
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setArchivos(prev => [...prev, ...files]);
  };

  const generarConIA = async () => {
    if (!url.trim() && archivos.length === 0) {
      setError("Pega la URL de tu clínica o sube al menos un documento.");
      return;
    }
    setProcesando(true);
    setError("");
    setIaResult(null);

    const form = new FormData();
    if (url.trim()) form.append("url", url.trim());
    archivos.forEach(f => form.append("archivos", f));

    try {
      const res = await fetch(
        `${backendUrl}/admin/clinicas/${clinicId}/configuracion/extraer`,
        { method: "POST", body: form }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error del servidor");
      }
      const data: IAResult = await res.json();
      setIaResult(data);
      if (data.prompt_generado) {
        setPrompt(data.prompt_generado);
        setTab("prompt");
      }
    } catch (e: any) {
      setError(e.message || "Error generando configuración");
    } finally {
      setProcesando(false);
    }
  };

  const guardarPrompt = async () => {
    setGuardando(true);
    setGuardado(false);
    try {
      const payload: any = { prompt_personalizado: prompt };
      if (iaResult?.servicios?.length) {
        payload.servicios = iaResult.servicios.map(s => ({
          nombre: s.nombre,
          duracion_min: 60,
          precio: s.precio || null,
        }));
      }
      if (iaResult?.horarios) {
        payload.horarios = iaResult.horarios;
      }
      const res = await fetch(
        `${backendUrl}/admin/clinicas/${clinicId}/configuracion/guardar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Error al guardar");
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, margin: "0 0 4px", fontWeight: 700 }}>Configuración del agente</h1>
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
          Sube información de tu clínica y la IA generará el prompt del recepcionista automáticamente.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: "#f3f4f6", borderRadius: 8, padding: 4, width: "fit-content" }}>
        {([["ia", "Generar con IA"], ["prompt", "System Prompt"], ["servicios", "Info extraída"]] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "6px 18px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
            background: tab === t ? "white" : "transparent",
            color: tab === t ? "#111827" : "#6b7280",
            boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}>
            {label}
            {t === "servicios" && iaResult && (
              <span style={{ marginLeft: 6, fontSize: 10, background: "#166534", color: "white", borderRadius: 8, padding: "1px 6px" }}>
                nuevo
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "10px 16px", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ── Tab: Generar con IA ── */}
      {tab === "ia" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* URL input */}
          <div style={{ background: "white", borderRadius: 10, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>
              Web de la clínica
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://clinicaejemplo.es"
                style={{
                  flex: 1, border: "1px solid #d1d5db", borderRadius: 8, padding: "9px 12px",
                  fontSize: 14, outline: "none", fontFamily: "inherit",
                }}
              />
            </div>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "6px 0 0" }}>
              La IA visitará la web y extraerá servicios, horarios, precios y toda la información relevante.
            </p>
          </div>

          {/* File drop */}
          <div
            ref={dropRef}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            style={{
              background: "white", borderRadius: 10, padding: 28,
              boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
              border: "2px dashed #d1d5db", cursor: "pointer", textAlign: "center",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
            <p style={{ fontSize: 14, color: "#374151", fontWeight: 500, margin: "0 0 4px" }}>
              Arrastra documentos aquí o haz clic para seleccionar
            </p>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
              PDF, Word (.docx), Excel (.xlsx), texto (.txt), CSV
            </p>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.csv,.xlsx,.md"
              style={{ display: "none" }}
              onChange={e => setArchivos(prev => [...prev, ...Array.from(e.target.files || [])])}
            />
          </div>

          {/* Archivos seleccionados */}
          {archivos.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {archivos.map((f, i) => (
                <div key={i} style={{
                  background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6,
                  padding: "4px 10px", fontSize: 12, color: "#166534",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {f.name}
                  <button onClick={() => setArchivos(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, lineHeight: 1, padding: 0 }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={generarConIA}
            disabled={procesando || (!url.trim() && archivos.length === 0)}
            style={{
              background: procesando ? "#9ca3af" : "#166534",
              color: "white", border: "none", borderRadius: 8,
              padding: "12px 24px", fontSize: 15, fontWeight: 600,
              cursor: procesando ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {procesando ? (
              <>
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite", fontSize: 16 }}>⟳</span>
                Analizando con IA… puede tardar 15–30 segundos
              </>
            ) : (
              "Analizar y generar prompt"
            )}
          </button>

          {iaResult && (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#166534" }}>
              ✓ Análisis completado. Ve a la pestaña <strong>System Prompt</strong> para revisar y guardar el resultado.
            </div>
          )}
        </div>
      )}

      {/* ── Tab: System Prompt ── */}
      {tab === "prompt" && (
        <div style={{ background: "white", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>System Prompt del agente</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                Este es el texto que define la personalidad y conocimiento del recepcionista IA.
              </div>
            </div>
            <button
              onClick={guardarPrompt}
              disabled={guardando}
              style={{
                background: guardado ? "#dcfce7" : "#166534",
                color: guardado ? "#166534" : "white",
                border: guardado ? "1px solid #86efac" : "none",
                borderRadius: 7, padding: "8px 20px", fontSize: 13, fontWeight: 600,
                cursor: guardando ? "not-allowed" : "pointer",
              }}
            >
              {guardado ? "✓ Guardado" : guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="El prompt del agente aparecerá aquí. Usa la pestaña 'Generar con IA' primero, o escríbelo tú mismo."
            rows={24}
            style={{
              width: "100%", border: "none", padding: "16px 20px",
              fontSize: 13, fontFamily: "monospace", lineHeight: 1.7,
              resize: "vertical", outline: "none", boxSizing: "border-box",
              color: "#111827", background: "white",
            }}
          />
          <div style={{ padding: "8px 20px", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>{prompt.length} caracteres</span>
            {prompt && (
              <button onClick={guardarPrompt} disabled={guardando} style={{
                background: guardado ? "#dcfce7" : "#166534", color: guardado ? "#166534" : "white",
                border: guardado ? "1px solid #86efac" : "none",
                borderRadius: 7, padding: "7px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                {guardado ? "✓ Guardado" : "Guardar prompt"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Info extraída ── */}
      {tab === "servicios" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {!iaResult ? (
            <div style={{ background: "white", borderRadius: 10, padding: 48, textAlign: "center", color: "#9ca3af", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
              <p style={{ margin: 0 }}>Usa la pestaña "Generar con IA" primero para extraer la información.</p>
            </div>
          ) : (
            <>
              {iaResult.resumen && (
                <InfoCard titulo="Resumen">
                  <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.7 }}>{iaResult.resumen}</p>
                </InfoCard>
              )}

              {iaResult.servicios && iaResult.servicios.length > 0 && (
                <InfoCard titulo={`Servicios detectados (${iaResult.servicios.length})`}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {iaResult.servicios.map((s, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f9fafb", borderRadius: 6 }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{s.nombre}</span>
                          {s.descripcion && <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 8 }}>{s.descripcion}</span>}
                        </div>
                        {s.precio && <span style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>{s.precio}</span>}
                      </div>
                    ))}
                  </div>
                </InfoCard>
              )}

              {iaResult.horarios && Object.keys(iaResult.horarios).length > 0 && (
                <InfoCard titulo="Horarios">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
                    {Object.entries(iaResult.horarios).map(([dia, horas]) => (
                      <div key={dia} style={{ fontSize: 12, padding: "6px 10px", background: "#f9fafb", borderRadius: 6 }}>
                        <span style={{ fontWeight: 600, color: "#374151", textTransform: "capitalize" }}>{dia}:</span>{" "}
                        <span style={{ color: "#6b7280" }}>{horas}</span>
                      </div>
                    ))}
                  </div>
                </InfoCard>
              )}

              {iaResult.faqs && iaResult.faqs.length > 0 && (
                <InfoCard titulo={`FAQs detectadas (${iaResult.faqs.length})`}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {iaResult.faqs.map((faq, i) => (
                      <div key={i}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 3 }}>P: {faq.pregunta}</div>
                        <div style={{ fontSize: 13, color: "#6b7280" }}>R: {faq.respuesta}</div>
                      </div>
                    ))}
                  </div>
                </InfoCard>
              )}

              {iaResult.especialidades && iaResult.especialidades.length > 0 && (
                <InfoCard titulo="Especialidades">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {iaResult.especialidades.map((e, i) => (
                      <span key={i} style={{ fontSize: 12, background: "#e0f2fe", color: "#0369a1", borderRadius: 10, padding: "3px 10px", fontWeight: 500 }}>
                        {e}
                      </span>
                    ))}
                  </div>
                </InfoCard>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "white", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.07)", overflow: "hidden" }}>
      <div style={{ padding: "12px 18px", borderBottom: "1px solid #f3f4f6", fontSize: 13, fontWeight: 600, color: "#374151" }}>
        {titulo}
      </div>
      <div style={{ padding: "14px 18px" }}>{children}</div>
    </div>
  );
}
