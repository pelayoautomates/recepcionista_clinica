"use client";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: 5 }}>
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          width: 16, height: 16, borderRadius: "50%",
          background: "#f3f4f6", border: "1px solid #d1d5db",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 9.5, color: "#6b7280", cursor: "help",
          fontWeight: 700, padding: 0, flexShrink: 0,
        }}
      >
        ?
      </button>
      {show && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
          transform: "translateX(-50%)",
          background: "#1f2937", color: "white",
          padding: "8px 11px", borderRadius: 7,
          fontSize: 11.5, lineHeight: 1.5,
          width: 240, whiteSpace: "normal",
          zIndex: 200, boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          pointerEvents: "none",
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

//  Types

type RoutingMode = "siempre" | "fuera_horario" | "si_no_contestan";
interface Msg { role: "user" | "assistant"; content: string; }

interface Props {
  clinica: any;
  clinicId: string;
  conocimiento: any[];
}

// Helpers

function getInitialDoc(clinica: any): string {
  const s = clinica.servicios;
  if (s && typeof s === "object" && s._doc) return s._doc as string;
  const parts: string[] = [];
  if (Array.isArray(s) && s.length > 0) {
    parts.push("Servicios:");
    s.forEach((sv: any) => {
      let line = `- ${sv.nombre}`;
      if (sv.duracion_min) line += ` (${sv.duracion_min} min)`;
      if (sv.precio_orientativo) line += `, ${sv.precio_orientativo}`;
      parts.push(line);
    });
  }
  if (clinica.horarios && Object.keys(clinica.horarios).length > 0) {
    parts.push("\nHorarios:");
    Object.entries(clinica.horarios).forEach(([dia, h]: [string, any]) => {
      if (typeof h === "string" && h) parts.push(`- ${dia}: ${h}`);
      else if (h?.start && h?.end) parts.push(`- ${dia}: ${h.start}-${h.end}`);
    });
  }
  return parts.join("\n");
}

function buildPrompt(nombre: string, doc: string): string {
  return `Eres la recepcionista virtual de ${nombre}. Responde siempre en espanol.

INFORMACION VERIFICADA DE LA CLINICA:
${doc}

INSTRUCCIONES:
- Usa un tono cercano pero profesional.
- Si el paciente quiere agendar una cita, usa las herramientas para consultar disponibilidad y crear la cita.
- Si no sabes algo con certeza, dilo claramente y ofrece derivar a un humano.
- Nunca inventes precios, horarios ni servicios que no esten en la informacion proporcionada.
- Cuando detectes interes real en agendar, pide nombre, telefono, servicio y fecha preferida.`;
}

//  Styles 

const card: CSSProperties = {
  background: "white", borderRadius: 12, border: "1px solid #e5e7eb",
  overflow: "hidden", marginBottom: 16,
};
const cardHeader: CSSProperties = {
  padding: "14px 18px", borderBottom: "1px solid #f3f4f6",
  fontSize: 14, fontWeight: 700, color: "#111827",
  display: "flex", alignItems: "center", gap: 8,
};
const cardBody: CSSProperties = { padding: "16px 18px" };
const inputSt: CSSProperties = {
  width: "100%", border: "1px solid #d1d5db", borderRadius: 8,
  padding: "9px 12px", fontSize: 13.5, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit", color: "#111827",
};
const label: CSSProperties = {
  fontSize: 12.5, fontWeight: 600, color: "#374151",
  display: "block", marginBottom: 5,
};
const hint: CSSProperties = { fontSize: 12, color: "#9ca3af", marginTop: 6 };

const ROUTING_MODES: { key: RoutingMode; label: string; desc: string; badge?: string }[] = [
  { key: "siempre",         label: "Siempre activo",         desc: "El agente contesta todas las llamadas entrantes, 24/7." },
  { key: "fuera_horario",   label: "Solo fuera de horario",  desc: "El agente solo contesta cuando la clinica est cerrada.", badge: "Gestionado por nosotros" },
  { key: "si_no_contestan", label: "Solo si no contestamos", desc: "La llamada va primero a recepcion; si no contesta nadie, pasa al agente.", badge: "Gestionado por nosotros" },
];

//  Main component 

export default function ConfiguracionWrapper({ clinica, clinicId }: Props) {
  const initialDoc = getInitialDoc(clinica);

  // Form state
  const [doc, setDoc]           = useState(initialDoc);
  const [routing, setRouting]   = useState<RoutingMode>(clinica.routing_mode || "siempre");
  const savedDocRef             = useRef(initialDoc);
  const [isDirty, setIsDirty]   = useState(false);

  // IA extraction
  const [showIA, setShowIA]     = useState(!initialDoc);
  const [url, setUrl]           = useState(clinica.url_web || "");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [procesando, setProcesando] = useState(false);
  const fileRef                 = useRef<HTMLInputElement>(null);

  // Save
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState("");

  // Drawer (test agent)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messages, setMessages]     = useState<Msg[]>([]);
  const [chatInput, setChatInput]   = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [convId, setConvId]         = useState<string | null>(null);
  const [chatError, setChatError]   = useState("");
  const bottomRef                   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (isDirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  //  IA extraction 

  async function generarConIA() {
    if (!url.trim() && archivos.length === 0) { setError("Pega la URL de tu clinica o sube un documento."); return; }
    setProcesando(true); setError("");
    const form = new FormData();
    if (url.trim()) form.append("url", url.trim());
    archivos.forEach(f => form.append("archivos", f));
    try {
      const res = await fetch(`/api/clinicas/${clinicId}/configuracion/extraer`, { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json()).detail || "Error del servidor");
      const data = await res.json();
      const lines: string[] = [];
      if (clinica.nombre) lines.push(`Clinica: ${clinica.nombre}`);
      if (data.resumen) lines.push(`\n${data.resumen}`);
      if (data.ubicacion) lines.push(`\nUbicacion: ${data.ubicacion}`);
      if (data.telefono) lines.push(`Telefono: ${data.telefono}`);
      if (data.web) lines.push(`Web: ${data.web}`);
      if (data.servicios?.length) {
        lines.push(`\nServicios:`);
        data.servicios.forEach((s: any) => {
          let l = `- ${s.nombre}`; if (s.precio) l += ` (${s.precio})`; if (s.descripcion) l += `: ${s.descripcion}`; lines.push(l);
        });
      }
      if (data.horarios && Object.keys(data.horarios).length) {
        lines.push(`\nHorarios:`);
        Object.entries(data.horarios).forEach(([d, h]) => lines.push(`- ${d}: ${h}`));
      }
      if (data.faqs?.length) {
        lines.push(`\nPreguntas frecuentes:`);
        data.faqs.forEach((f: any) => lines.push(`- ${f.pregunta}\n  ${f.respuesta}`));
      }
      const newDoc = lines.join("\n");
      setDoc(newDoc); savedDocRef.current = newDoc; setIsDirty(false);
      setShowIA(false);
    } catch (e: any) { setError(e.message || "Error generando configuracion"); }
    finally { setProcesando(false); }
  }

  //  Save 

  async function guardar() {
    setSaving(true); setSaved(false); setError("");
    try {
      const res = await fetch(`/api/clinicas/${clinicId}/configuracion/guardar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt_personalizado: buildPrompt(clinica.nombre, doc),
          servicios: { _doc: doc },
          horarios: clinica.horarios || {},
          routing_mode: routing,
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || "Error al guardar"); }
      savedDocRef.current = doc; setIsDirty(false);
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e: any) { setError(e.message || "No se pudo guardar"); }
    finally { setSaving(false); }
  }

  //  Chat (drawer) 

  async function sendChat() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput(""); setChatError("");
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setChatLoading(true);
    try {
      const res = await fetch(`/api/clinicas/${clinicId}/test-chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: text, conversacion_id: convId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || `Error ${res.status}`);
      setConvId(data.conversacion_id);
      setMessages(prev => [...prev, { role: "assistant", content: data.respuesta }]);
    } catch (e: any) {
      setChatError(e.message || "Error al conectar con el agente");
      setMessages(prev => prev.slice(0, -1)); setChatInput(text);
    } finally { setChatLoading(false); }
  }

  //  Render 

  return (
    <>
      <div style={{ maxWidth: 720, paddingBottom: 80 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 4px", letterSpacing: "-0.03em" }}>
              Tu recepcionista IA
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, color: "#6b7280" }}>
              Rellena la informacion de tu clinica y el agente sabra todo lo necesario para atender a tus pacientes.
            </p>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#111827", color: "white", border: "none",
              borderRadius: 10, padding: "10px 18px", fontSize: 13.5,
              fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1v8M4.5 6l3 3 3-3M2 11h11" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Probar agente
          </button>
        </div>

        {error && (
          <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/*  1. Entrenar con IA  */}
        <div style={card}>
          <button
            onClick={() => setShowIA(p => !p)}
            style={{
              ...cardHeader, width: "100%", textAlign: "left",
              background: "none", border: "none", cursor: "pointer",
              justifyContent: "space-between",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L9.3 4.8H12.5L9.9 6.9L10.8 10.5L8 8.5L5.2 10.5L6.1 6.9L3.5 4.8H6.7L8 1.5Z" stroke="#7c3aed" strokeWidth="1.2" strokeLinejoin="round"/></svg>
              Rellenar con IA (opcional)
            </span>
            <span style={{ fontSize: 18, color: "#9ca3af", fontWeight: 400 }}>{showIA ? "-" : "+"}</span>
          </button>

          {showIA && (
            <div style={cardBody}>
              <p style={{ ...hint, marginTop: 0, marginBottom: 12, color: "#6b7280" }}>
                Pega la web de tu clinica y la IA extrae servicios, horarios y precios automaticamente.
              </p>
              <label style={label}>Web de la clinica</label>
              <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://miclinica.com" style={{ ...inputSt, marginBottom: 12 }} />
              <label style={label}>Documentos adicionales <span style={{ fontWeight: 400, color: "#9ca3af" }}>(PDF, DOCX, TXT)</span></label>
              <div
                onClick={() => fileRef.current?.click()}
                onDrop={e => { e.preventDefault(); setArchivos(p => [...p, ...Array.from(e.dataTransfer.files)]); }}
                onDragOver={e => e.preventDefault()}
                style={{
                  border: "2px dashed #e5e7eb", borderRadius: 8, padding: "16px",
                  textAlign: "center", cursor: "pointer", marginBottom: 12, color: "#9ca3af", fontSize: 13,
                }}
              >
                Arrastra archivos o haz clic para seleccionar
                <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt,.csv,.xlsx,.md" style={{ display: "none" }}
                  onChange={e => setArchivos(p => [...p, ...Array.from(e.target.files || [])])} />
              </div>
              {archivos.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {archivos.map((f, i) => (
                    <span key={i} style={{ background: "#f3f4f6", borderRadius: 20, padding: "3px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      {f.name}
                      <button onClick={() => setArchivos(p => p.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, padding: 0 }}>x</button>
                    </span>
                  ))}
                </div>
              )}
              <button
                onClick={generarConIA}
                disabled={procesando || (!url.trim() && archivos.length === 0)}
                style={{
                  background: procesando ? "#9ca3af" : "#7c3aed", color: "white",
                  border: "none", borderRadius: 8, padding: "9px 18px",
                  fontSize: 13.5, fontWeight: 600, cursor: procesando ? "not-allowed" : "pointer",
                }}
              >
                {procesando ? "Analizando con IA..." : "Analizar y rellenar"}
              </button>
            </div>
          )}
        </div>

        {/*  2. Informacion  */}
        <div style={card}>
          <div style={cardHeader}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="#2563eb" strokeWidth="1.3"/><path d="M5 6h6M5 8.5h4M5 11h5" stroke="#2563eb" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Información de tu clínica
            <InfoTooltip text="Esta es la 'memoria' de tu recepcionista IA. Cuanta más información incluyas (servicios, precios, horarios, FAQs), mejor responderá a los pacientes." />
            {isDirty && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "2px 7px", marginLeft: 4 }}>
                Sin guardar
              </span>
            )}
          </div>
          <div style={cardBody}>
            <textarea
              value={doc}
              onChange={e => { setDoc(e.target.value); setIsDirty(e.target.value !== savedDocRef.current); }}
              rows={16}
              placeholder={`Clinica: Nombre de la clinica\n\nServicios:\n- Limpieza dental (60 min, 80)\n- Ortodoncia invisible\n- Implantes dentales\n\nHorarios:\n- Lunes a viernes: 9:00-14:00 y 16:00-20:00\n- Sabados: 10:00-14:00\n\nTelefono: +34 600 000 000\nDireccion: Calle Mayor 1, Madrid`}
              style={{ ...inputSt, fontFamily: "ui-monospace,monospace", fontSize: 13, lineHeight: 1.7, minHeight: 300, resize: "vertical" }}
            />
            <p style={hint}>Edita libremente. El agente usara exactamente esta informacion para responder.</p>
          </div>
        </div>

        {/*  3. Routing  */}
        <div style={card}>
          <div style={cardHeader}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h7A1.5 1.5 0 0 1 13 4.5v7a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 11.5v-7z" stroke="#f59e0b" strokeWidth="1.3"/><path d="M8 6v4M6 8h4" stroke="#f59e0b" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Cuándo atiende las llamadas
            <InfoTooltip text="Controla en qué momento el agente coge las llamadas. Solo funciona si tienes un número de teléfono IA activo en Canales." />
          </div>
          <div style={{ ...cardBody, display: "flex", flexDirection: "column", gap: 8 }}>
            {ROUTING_MODES.map(m => (
              <button
                key={m.key}
                onClick={() => setRouting(m.key)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
                  border: `2px solid ${routing === m.key ? "#f59e0b" : "#e5e7eb"}`,
                  borderRadius: 10, background: routing === m.key ? "#fffbeb" : "white",
                  cursor: "pointer", textAlign: "left", transition: "all 0.12s",
                }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                  border: `2px solid ${routing === m.key ? "#f59e0b" : "#d1d5db"}`,
                  background: routing === m.key ? "#f59e0b" : "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {routing === m.key && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "#111827" }}>{m.label}</span>
                    {m.badge && (
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: "#7c3aed", background: "#ede9fe", padding: "2px 7px", borderRadius: 20 }}>
                        {m.badge}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, color: "#6b7280" }}>{m.desc}</p>
                </div>
              </button>
            ))}
            {routing !== "siempre" && (
              <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, color: "#92400e" }}>
                Este modo requiere configuracion en la central telefonica. Te contactaremos para aplicarlo en Telnyx.
              </div>
            )}
          </div>
        </div>

        {/*  Save  */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={guardar}
            disabled={saving}
            style={{
              background: saved ? "#dcfce7" : "#111827",
              color: saved ? "#166534" : "white",
              border: saved ? "1px solid #86efac" : "none",
              borderRadius: 10, padding: "11px 26px",
              fontSize: 14, fontWeight: 600, cursor: saving ? "wait" : "pointer",
              display: "flex", alignItems: "center", gap: 7,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saved ? (
              <><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="#166534" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>Guardado</>
            ) : saving ? "Guardando..." : "Guardar todo"}
          </button>
        </div>
      </div>

      {/*  Drawer: probar agente  */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 40 }}
        />
      )}
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: 380,
        background: "white", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        zIndex: 50, display: "flex", flexDirection: "column",
        transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s ease",
      }}>
        {/* Drawer header */}
        <div style={{
          padding: "16px 18px", borderBottom: "1px solid #e5e7eb",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Probar agente</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Modo test - sin coste de minutos</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { setMessages([]); setConvId(null); setChatError(""); }}
              title="Nueva conversacion"
              style={{ background: "#f3f4f6", border: "none", borderRadius: 7, padding: "6px 10px", cursor: "pointer", fontSize: 12, color: "#374151" }}
            >
              Nueva
            </button>
            <button
              onClick={() => setDrawerOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9ca3af", padding: "2px 6px" }}
            >
              x
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13, marginTop: 32 }}>
              Escribe un mensaje para probar como responde el agente con la configuracion actual.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "82%", padding: "9px 13px", borderRadius: 12, fontSize: 13.5, lineHeight: 1.5,
                background: m.role === "user" ? "#111827" : "#f3f4f6",
                color: m.role === "user" ? "white" : "#111827",
                borderBottomRightRadius: m.role === "user" ? 3 : 12,
                borderBottomLeftRadius: m.role === "assistant" ? 3 : 12,
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ background: "#f3f4f6", borderRadius: 12, borderBottomLeftRadius: 3, padding: "9px 14px" }}>
                <span style={{ fontSize: 20, letterSpacing: 3, color: "#9ca3af" }}>...</span>
              </div>
            </div>
          )}
          {chatError && <p style={{ fontSize: 12, color: "#dc2626", textAlign: "center" }}>{chatError}</p>}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "12px 14px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
          <textarea
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
            placeholder="Escribe un mensaje... (Enter para enviar)"
            rows={2}
            style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 10px", fontSize: 13, resize: "none", fontFamily: "inherit", outline: "none" }}
          />
          <button
            onClick={sendChat}
            disabled={chatLoading || !chatInput.trim()}
            style={{
              background: chatLoading || !chatInput.trim() ? "#e5e7eb" : "#111827",
              color: chatLoading || !chatInput.trim() ? "#9ca3af" : "white",
              border: "none", borderRadius: 8, padding: "0 14px",
              cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer",
              fontFamily: "inherit", fontSize: 13, fontWeight: 600,
            }}
          >
            Enviar
          </button>
        </div>
      </div>
    </>
  );
}
