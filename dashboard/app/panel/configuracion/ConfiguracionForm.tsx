"use client";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

type Clinica = {
  id: string;
  nombre: string;
  telefono?: string;
  email_contacto?: string;
  horarios?: Record<string, { start?: string; end?: string } | string>;
  servicios?: Array<{ nombre: string; duracion_min?: number; precio_orientativo?: number | string | null }>;
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

type ServicioExtraido = {
  nombre: string;
  descripcion: string;
  precio: string;
  duracionMin: number;
};

type Faq = { pregunta: string; respuesta: string };

type Extraido = {
  resumen: string;
  ubicacion: string;
  telefono: string;
  web: string;
  tono: string;
  especialidadesTexto: string;
  horarios: Record<string, string>;
  servicios: ServicioExtraido[];
  faqs: Faq[];
};

type Tab = "info" | "ia" | "avanzado";

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

export default function ConfiguracionForm({
  clinica: initial,
  clinicId,
  backendUrl,
}: {
  clinica: Clinica;
  clinicId: string;
  backendUrl: string;
}) {
  const [tab, setTab] = useState<Tab>("info");
  const [url, setUrl] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");
  const [iaResult, setIaResult] = useState<IAResult | null>(null);
  const [extraido, setExtraido] = useState<Extraido>(() => construirDesdeClinica(initial));
  const [prompt, setPrompt] = useState(initial.prompt_personalizado || "");
  const [editarPromptManual, setEditarPromptManual] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editarPromptManual) return;
    setPrompt(generarPromptDesdeInfo(initial.nombre, extraido));
  }, [extraido, initial.nombre, editarPromptManual]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setArchivos((prev) => [...prev, ...files]);
  };

  const generarConIA = async () => {
    if (!url.trim() && archivos.length === 0) {
      setError("Pega la URL de tu clinica o sube al menos un documento.");
      return;
    }

    setProcesando(true);
    setError("");

    const form = new FormData();
    if (url.trim()) form.append("url", url.trim());
    archivos.forEach((f) => form.append("archivos", f));

    try {
      const res = await fetch(`${backendUrl}/admin/clinicas/${clinicId}/configuracion/extraer`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error del servidor");
      }
      const data: IAResult = await res.json();
      setIaResult(data);
      setExtraido((prev) => combinarExtraido(prev, data));
      setEditarPromptManual(false);
      setTab("info");
    } catch (e: any) {
      setError(e.message || "Error generando configuracion");
    } finally {
      setProcesando(false);
    }
  };

  const guardarConfiguracion = async () => {
    setGuardando(true);
    setGuardado(false);
    setError("");

    const payload: any = {
      prompt_personalizado: prompt,
      horarios: convertirHorarios(extraido.horarios),
      servicios: extraido.servicios
        .filter((s) => s.nombre.trim())
        .map((s) => ({
          nombre: s.nombre.trim(),
          duracion_min: Number.isFinite(s.duracionMin) ? s.duracionMin : 60,
          precio_orientativo: parsePrecio(s.precio),
        })),
    };

    try {
      const res = await fetch(`${backendUrl}/admin/clinicas/${clinicId}/configuracion/guardar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } catch (e: any) {
      setError(e.message || "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ maxWidth: 980 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 23, margin: "0 0 4px", fontWeight: 700, color: "#111827" }}>Configuracion del agente</h1>
        <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
          Enfocate en revisar la informacion extraida. El prompt tecnico se genera automaticamente a partir de esos datos.
        </p>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {([ ["info", "Info extraida"], ["ia", "Generar con IA"], ["avanzado", "Avanzado"] ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: tab === t ? "1px solid #d1d5db" : "1px solid #e5e7eb",
              background: tab === t ? "#ffffff" : "#f9fafb",
              color: tab === t ? "#111827" : "#6b7280",
              fontWeight: tab === t ? 600 : 500,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {tab === "info" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card title="Datos principales">
            <Field label="Resumen">
              <textarea value={extraido.resumen} onChange={(e) => setExtraido((p) => ({ ...p, resumen: e.target.value }))} rows={4} style={inputStyle} />
            </Field>
            <Inline2>
              <Field label="Telefono">
                <input value={extraido.telefono} onChange={(e) => setExtraido((p) => ({ ...p, telefono: e.target.value }))} style={inputStyle} />
              </Field>
              <Field label="Web">
                <input value={extraido.web} onChange={(e) => setExtraido((p) => ({ ...p, web: e.target.value }))} style={inputStyle} />
              </Field>
            </Inline2>
            <Inline2>
              <Field label="Ubicacion">
                <input value={extraido.ubicacion} onChange={(e) => setExtraido((p) => ({ ...p, ubicacion: e.target.value }))} style={inputStyle} />
              </Field>
              <Field label="Tono">
                <input value={extraido.tono} onChange={(e) => setExtraido((p) => ({ ...p, tono: e.target.value }))} placeholder="cercano y profesional" style={inputStyle} />
              </Field>
            </Inline2>
            <Field label="Especialidades (separadas por coma)">
              <input value={extraido.especialidadesTexto} onChange={(e) => setExtraido((p) => ({ ...p, especialidadesTexto: e.target.value }))} style={inputStyle} />
            </Field>
          </Card>

          <Card title="Servicios">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {extraido.servicios.map((s, i) => (
                <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
                  <Inline3>
                    <input value={s.nombre} onChange={(e) => editarServicio(i, "nombre", e.target.value)} placeholder="Nombre" style={inputStyle} />
                    <input value={s.precio} onChange={(e) => editarServicio(i, "precio", e.target.value)} placeholder="Precio" style={inputStyle} />
                    <input value={String(s.duracionMin)} onChange={(e) => editarServicio(i, "duracionMin", Number(e.target.value) || 60)} placeholder="Min" style={inputStyle} />
                  </Inline3>
                  <textarea value={s.descripcion} onChange={(e) => editarServicio(i, "descripcion", e.target.value)} rows={2} placeholder="Descripcion" style={{ ...inputStyle, marginTop: 8 }} />
                  <div style={{ marginTop: 8 }}>
                    <button onClick={() => setExtraido((p) => ({ ...p, servicios: p.servicios.filter((_, idx) => idx !== i) }))} style={softBtn}>
                      Eliminar servicio
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => setExtraido((p) => ({ ...p, servicios: [...p.servicios, { nombre: "", descripcion: "", precio: "", duracionMin: 60 }] }))} style={softBtn}>
                + Anadir servicio
              </button>
            </div>
          </Card>

          <Card title="Horarios">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {DIAS.map((dia) => (
                <Field key={dia} label={capitalizar(dia)}>
                  <input
                    value={extraido.horarios[dia] || ""}
                    onChange={(e) => setExtraido((p) => ({ ...p, horarios: { ...p.horarios, [dia]: e.target.value } }))}
                    placeholder="09:00-14:00, 16:00-20:00"
                    style={inputStyle}
                  />
                </Field>
              ))}
            </div>
          </Card>

          <Card title="FAQs (opcional)">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {extraido.faqs.map((faq, i) => (
                <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
                  <input value={faq.pregunta} onChange={(e) => editarFaq(i, "pregunta", e.target.value)} placeholder="Pregunta" style={{ ...inputStyle, marginBottom: 8 }} />
                  <textarea value={faq.respuesta} onChange={(e) => editarFaq(i, "respuesta", e.target.value)} placeholder="Respuesta" rows={2} style={inputStyle} />
                  <div style={{ marginTop: 8 }}>
                    <button onClick={() => setExtraido((p) => ({ ...p, faqs: p.faqs.filter((_, idx) => idx !== i) }))} style={softBtn}>
                      Eliminar FAQ
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => setExtraido((p) => ({ ...p, faqs: [...p.faqs, { pregunta: "", respuesta: "" }] }))} style={softBtn}>
                + Anadir FAQ
              </button>
            </div>
          </Card>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Cada cambio en info extraida actualiza el prompt tecnico automaticamente.
            </div>
            <button onClick={guardarConfiguracion} disabled={guardando} style={primaryBtn(guardado)}>
              {guardado ? "Guardado" : guardando ? "Guardando..." : "Guardar configuracion"}
            </button>
          </div>
        </div>
      )}

      {tab === "ia" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card title="Web de la clinica">
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://clinicatuweb.com" style={inputStyle} />
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "7px 0 0" }}>
              Tambien puedes combinar URL + documentos para mejorar la extraccion.
            </p>
          </Card>

          <Card title="Documentos">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              style={{ border: "2px dashed #d1d5db", borderRadius: 10, padding: 22, textAlign: "center", cursor: "pointer" }}
            >
              <div style={{ fontSize: 14, color: "#374151", marginBottom: 4 }}>Arrastra archivos o haz clic para seleccionar</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>PDF, DOCX, TXT, CSV, XLSX, MD</div>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.csv,.xlsx,.md"
                style={{ display: "none" }}
                onChange={(e) => setArchivos((prev) => [...prev, ...Array.from(e.target.files || [])])}
              />
            </div>
            {archivos.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {archivos.map((f, i) => (
                  <span key={i} style={{ background: "#f3f4f6", borderRadius: 999, padding: "5px 10px", fontSize: 12, color: "#374151" }}>
                    {f.name}
                  </span>
                ))}
              </div>
            )}
          </Card>

          <button onClick={generarConIA} disabled={procesando || (!url.trim() && archivos.length === 0)} style={primaryBtn(false)}>
            {procesando ? "Analizando con IA..." : "Analizar y actualizar info"}
          </button>

          {iaResult && (
            <div style={{ background: "#ecfeff", border: "1px solid #bae6fd", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#0c4a6e" }}>
              Analisis completado. Revisa "Info extraida" y guarda cuando este correcto.
            </div>
          )}
        </div>
      )}

      {tab === "avanzado" && (
        <Card title="System prompt (tecnico)">
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", marginBottom: 10 }}>
            <input type="checkbox" checked={editarPromptManual} onChange={(e) => setEditarPromptManual(e.target.checked)} />
            Editar prompt manualmente
          </label>
          {!editarPromptManual && (
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
              Modo automatico activo: el prompt se genera desde la informacion extraida.
            </div>
          )}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={20}
            disabled={!editarPromptManual}
            style={{ ...inputStyle, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12.5, lineHeight: 1.6 }}
          />
          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>{prompt.length} caracteres</span>
            <button onClick={guardarConfiguracion} disabled={guardando} style={primaryBtn(guardado)}>
              {guardado ? "Guardado" : guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </Card>
      )}
    </div>
  );

  function editarServicio<K extends keyof ServicioExtraido>(idx: number, key: K, value: ServicioExtraido[K]) {
    setExtraido((prev) => ({
      ...prev,
      servicios: prev.servicios.map((s, i) => (i === idx ? { ...s, [key]: value } : s)),
    }));
  }

  function editarFaq<K extends keyof Faq>(idx: number, key: K, value: Faq[K]) {
    setExtraido((prev) => ({
      ...prev,
      faqs: prev.faqs.map((s, i) => (i === idx ? { ...s, [key]: value } : s)),
    }));
  }
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #f3f4f6", fontSize: 13, fontWeight: 700, color: "#374151" }}>{title}</div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

function Inline2({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{children}</div>;
}

function Inline3({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 88px", gap: 8 }}>{children}</div>;
}

const inputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const softBtn: CSSProperties = {
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#374151",
  borderRadius: 7,
  padding: "6px 10px",
  fontSize: 12,
  cursor: "pointer",
};

function primaryBtn(done: boolean): CSSProperties {
  return {
    border: done ? "1px solid #86efac" : "none",
    background: done ? "#dcfce7" : "#111827",
    color: done ? "#166534" : "#ffffff",
    borderRadius: 8,
    padding: "9px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  };
}

function construirDesdeClinica(clinica: Clinica): Extraido {
  const horarios: Record<string, string> = {};
  DIAS.forEach((dia) => {
    const h = clinica.horarios?.[dia];
    if (!h) {
      horarios[dia] = "";
      return;
    }

    if (typeof h === "string") {
      horarios[dia] = h;
      return;
    }

    if (typeof h === "object" && h.start && h.end) {
      horarios[dia] = `${h.start}-${h.end}`;
      return;
    }

    horarios[dia] = "";
  });

  return {
    resumen: "",
    ubicacion: "",
    telefono: clinica.telefono || "",
    web: "",
    tono: "cercano y profesional",
    especialidadesTexto: "",
    horarios,
    servicios: (clinica.servicios || []).map((s) => ({
      nombre: s.nombre || "",
      descripcion: "",
      precio: s.precio_orientativo != null ? String(s.precio_orientativo) : "",
      duracionMin: s.duracion_min || 60,
    })),
    faqs: [],
  };
}

function combinarExtraido(actual: Extraido, ia: IAResult): Extraido {
  const serviciosIA = (ia.servicios || []).map((s) => ({
    nombre: s.nombre || "",
    descripcion: s.descripcion || "",
    precio: s.precio || "",
    duracionMin: 60,
  }));

  const horariosActualizados = { ...actual.horarios };
  if (ia.horarios) {
    for (const [k, v] of Object.entries(ia.horarios)) {
      const key = normalizarDia(k);
      if (key) horariosActualizados[key] = v || "";
    }
  }

  return {
    resumen: ia.resumen || actual.resumen,
    ubicacion: ia.ubicacion || actual.ubicacion,
    telefono: ia.telefono || actual.telefono,
    web: ia.web || actual.web,
    tono: ia.tono || actual.tono,
    especialidadesTexto: ia.especialidades?.join(", ") || actual.especialidadesTexto,
    horarios: horariosActualizados,
    servicios: serviciosIA.length > 0 ? serviciosIA : actual.servicios,
    faqs: ia.faqs && ia.faqs.length > 0 ? ia.faqs : actual.faqs,
  };
}

function convertirHorarios(horarios: Record<string, string>) {
  const out: Record<string, { start: string; end: string }> = {};
  for (const [dia, valor] of Object.entries(horarios)) {
    const t = valor.trim();
    if (!t) continue;
    const [startRaw, endRaw] = t.split("-");
    const start = (startRaw || "").trim();
    const end = (endRaw || "").trim();
    if (!start || !end) continue;
    out[dia] = { start, end };
  }
  return out;
}

function parsePrecio(input: string): number | null {
  if (!input) return null;
  const clean = input.replace(/[^\d.,]/g, "").replace(",", ".");
  const num = Number(clean);
  return Number.isFinite(num) ? num : null;
}

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function normalizarDia(texto: string): string | null {
  const t = texto.toLowerCase().trim();
  if (t.startsWith("lun")) return "lunes";
  if (t.startsWith("mar")) return "martes";
  if (t.startsWith("mie") || t.startsWith("mié")) return "miercoles";
  if (t.startsWith("jue")) return "jueves";
  if (t.startsWith("vie")) return "viernes";
  if (t.startsWith("sab") || t.startsWith("sáb")) return "sabado";
  if (t.startsWith("dom")) return "domingo";
  return null;
}

function generarPromptDesdeInfo(nombreClinica: string, info: Extraido) {
  const servicios = info.servicios
    .filter((s) => s.nombre.trim())
    .map((s) => `- ${s.nombre.trim()} (${s.duracionMin || 60} min${s.precio ? `, precio orientativo ${s.precio}` : ""})${s.descripcion ? `: ${s.descripcion}` : ""}`)
    .join("\n");

  const horarios = Object.entries(info.horarios)
    .filter(([, v]) => v.trim())
    .map(([dia, v]) => `- ${capitalizar(dia)}: ${v.trim()}`)
    .join("\n");

  const especialidades = info.especialidadesTexto
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => `- ${x}`)
    .join("\n");

  const faqs = info.faqs
    .filter((f) => f.pregunta.trim() && f.respuesta.trim())
    .map((f) => `- P: ${f.pregunta.trim()}\n  R: ${f.respuesta.trim()}`)
    .join("\n");

  return [
    `Eres la recepcionista virtual de ${nombreClinica}.`,
    "",
    "Usa esta informacion verificada de la clinica para responder:",
    info.resumen ? `Resumen: ${info.resumen}` : "",
    info.ubicacion ? `Ubicacion: ${info.ubicacion}` : "",
    info.telefono ? `Telefono: ${info.telefono}` : "",
    info.web ? `Web: ${info.web}` : "",
    info.tono ? `Tono preferido: ${info.tono}` : "",
    servicios ? `\nServicios:\n${servicios}` : "",
    horarios ? `\nHorarios:\n${horarios}` : "",
    especialidades ? `\nEspecialidades:\n${especialidades}` : "",
    faqs ? `\nFAQs:\n${faqs}` : "",
    "",
    "Si falta informacion para confirmar algo importante, pidela antes de inventar.",
  ]
    .filter(Boolean)
    .join("\n");
}
