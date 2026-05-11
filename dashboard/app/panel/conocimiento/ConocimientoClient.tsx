"use client";
import { useState } from "react";

type Entrada = {
  id: string;
  titulo: string;
  contenido: string;
  tipo: string;
  activo: boolean;
  orden: number;
};

const TIPOS: { value: string; label: string; color: string; desc: string }[] = [
  { value: "faq", label: "FAQ", color: "#2563eb", desc: "Preguntas frecuentes de pacientes" },
  { value: "proceso", label: "Proceso", color: "#7c3aed", desc: "Cómo funciona un servicio o trámite" },
  { value: "precio", label: "Precio", color: "#059669", desc: "Tarifas y condiciones de pago" },
  { value: "politica", label: "Política", color: "#d97706", desc: "Normas de la clínica" },
  { value: "otro", label: "Otro", color: "#6b7280", desc: "Información adicional" },
];

const EMPTY = (): Partial<Entrada> => ({
  titulo: "", contenido: "", tipo: "faq", activo: true, orden: 0,
});

function tipoDe(tipo: string) {
  return TIPOS.find(t => t.value === tipo) ?? TIPOS[TIPOS.length - 1];
}

export default function ConocimientoClient({
  clinicId,
  initialEntradas,
}: { clinicId: string; initialEntradas: Entrada[] }) {
  const [entradas, setEntradas] = useState<Entrada[]>(initialEntradas);
  const [editing, setEditing] = useState<Partial<Entrada> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isNew = editing !== null && !(editing as Entrada).id;

  async function save() {
    if (!editing?.titulo?.trim()) { setError("El título es obligatorio"); return; }
    if (!editing?.contenido?.trim()) { setError("El contenido es obligatorio"); return; }
    setSaving(true); setError("");
    try {
      const url = isNew
        ? `/api/clinicas/${clinicId}/conocimiento`
        : `/api/clinicas/${clinicId}/conocimiento/${(editing as Entrada).id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved: Entrada = await res.json();
      setEntradas(prev =>
        isNew ? [saved, ...prev] : prev.map(e => e.id === saved.id ? saved : e)
      );
      setEditing(null);
    } catch (e: any) {
      setError(e.message);
    } finally { setSaving(false); }
  }

  async function toggleActivo(e: Entrada) {
    const res = await fetch(`/api/clinicas/${clinicId}/conocimiento/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !e.activo }),
    });
    if (res.ok) {
      const updated = await res.json();
      setEntradas(prev => prev.map(x => x.id === updated.id ? updated : x));
    }
  }

  async function eliminar(e: Entrada) {
    if (!confirm(`¿Eliminar "${e.titulo}"?`)) return;
    const res = await fetch(`/api/clinicas/${clinicId}/conocimiento/${e.id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setEntradas(prev => prev.filter(x => x.id !== e.id));
    }
  }

  const activas = entradas.filter(e => e.activo).length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#111827" }}>
          Base de conocimiento
        </h1>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
          El agente IA usa estas entradas para responder preguntas con precisión.
          {activas > 0 && ` ${activas} entrada${activas !== 1 ? "s" : ""} activa${activas !== 1 ? "s" : ""}.`}
        </p>
      </div>

      {/* Banner explicativo si está vacío */}
      {entradas.length === 0 && (
        <div style={{
          background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12,
          padding: "20px 24px", marginBottom: 24, display: "flex", gap: 16, alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>💡</span>
          <div>
            <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: 14, color: "#1e40af" }}>
              ¿Cómo funciona la base de conocimiento?
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#3b82f6", lineHeight: 1.6 }}>
              Añade FAQs, precios, políticas o procesos de tu clínica. El agente IA los leerá antes de cada conversación y los usará para responder con exactitud. Sin entradas, el agente solo conoce lo configurado en Servicios y Configuración.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TIPOS.map(t => {
            const count = entradas.filter(e => e.tipo === t.value).length;
            if (count === 0) return null;
            return (
              <span key={t.value} style={{
                fontSize: 12, padding: "3px 10px", borderRadius: 20,
                background: `${t.color}15`, color: t.color, fontWeight: 600,
              }}>
                {t.label} ({count})
              </span>
            );
          })}
        </div>
        <button onClick={() => { setEditing(EMPTY()); setError(""); }} style={btnPrimaryStyle}>
          + Nueva entrada
        </button>
      </div>

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {entradas.map(e => {
          const meta = tipoDe(e.tipo);
          return (
            <div key={e.id} style={{
              background: "white", border: "1px solid #e5e7eb", borderRadius: 12,
              padding: "16px 20px", opacity: e.activo ? 1 : 0.55,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 11.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                      background: `${meta.color}15`, color: meta.color,
                    }}>
                      {meta.label}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{e.titulo}</span>
                    {!e.activo && (
                      <span style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}>inactiva</span>
                    )}
                  </div>
                  <p style={{
                    margin: 0, fontSize: 13, color: "#6b7280", lineHeight: 1.5,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {e.contenido}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => { setEditing({ ...e }); setError(""); }} style={btnGhostStyle}>
                    Editar
                  </button>
                  <button onClick={() => toggleActivo(e)} style={btnGhostStyle}>
                    {e.activo ? "Desactivar" : "Activar"}
                  </button>
                  <button onClick={() => eliminar(e)} style={{ ...btnGhostStyle, color: "#dc2626" }}>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal edición/creación */}
      {editing !== null && (
        <div style={overlayStyle} onClick={() => setEditing(null)}>
          <div style={modalStyle} onClick={ev => ev.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>
              {isNew ? "Nueva entrada" : "Editar entrada"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Field label="Tipo">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {TIPOS.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setEditing({ ...editing, tipo: t.value })}
                      style={{
                        padding: "5px 12px", borderRadius: 20, fontSize: 13, cursor: "pointer",
                        fontFamily: "inherit", fontWeight: editing.tipo === t.value ? 700 : 400,
                        border: editing.tipo === t.value ? `2px solid ${t.color}` : "1px solid #d1d5db",
                        background: editing.tipo === t.value ? `${t.color}12` : "white",
                        color: editing.tipo === t.value ? t.color : "#6b7280",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {editing.tipo && (
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9ca3af" }}>
                    {tipoDe(editing.tipo).desc}
                  </p>
                )}
              </Field>

              <Field label="Título *">
                <input
                  style={inputStyle}
                  value={editing.titulo ?? ""}
                  onChange={ev => setEditing({ ...editing, titulo: ev.target.value })}
                  placeholder="ej: ¿Aceptáis seguro dental?"
                />
              </Field>

              <Field label="Contenido *">
                <textarea
                  style={{ ...inputStyle, minHeight: 120, resize: "vertical" }}
                  value={editing.contenido ?? ""}
                  onChange={ev => setEditing({ ...editing, contenido: ev.target.value })}
                  placeholder="Escribe aquí la respuesta o información que el agente debe conocer..."
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
                <Field label="Orden (menor aparece primero)">
                  <input
                    type="number"
                    style={inputStyle}
                    value={editing.orden ?? 0}
                    onChange={ev => setEditing({ ...editing, orden: Number(ev.target.value) })}
                    min={0}
                  />
                </Field>
                <Field label="Estado">
                  <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, cursor: "pointer", fontSize: 13.5 }}>
                    <input
                      type="checkbox"
                      checked={!!editing.activo}
                      onChange={ev => setEditing({ ...editing, activo: ev.target.checked })}
                    />
                    Activa (el agente la usa)
                  </label>
                </Field>
              </div>
            </div>

            {error && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 12 }}>{error}</p>}

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setEditing(null)} style={btnGhostStyle}>Cancelar</button>
              <button onClick={save} disabled={saving} style={btnPrimaryStyle}>
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const btnPrimaryStyle: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 7, border: "none", background: "#2563eb",
  color: "white", fontWeight: 600, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit",
};
const btnGhostStyle: React.CSSProperties = {
  padding: "7px 14px", borderRadius: 7, border: "1px solid #e5e7eb", background: "white",
  color: "#374151", fontWeight: 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid #d1d5db",
  fontSize: 13.5, fontFamily: "inherit", boxSizing: "border-box",
};
const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100,
  display: "flex", alignItems: "center", justifyContent: "center",
};
const modalStyle: React.CSSProperties = {
  background: "white", borderRadius: 12, padding: "28px 32px", width: "100%",
  maxWidth: 580, maxHeight: "90vh", overflowY: "auto",
  boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
};
