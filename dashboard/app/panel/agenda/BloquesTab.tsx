"use client";
import { useEffect, useState } from "react";

type Bloque = {
  id: string;
  titulo: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  profesional_id?: string | null;
  sala_id?: string | null;
  notas?: string | null;
};

type Prof = { id: string; nombre: string };
type Sala = { id: string; nombre: string };

const TIPOS: { value: string; label: string; color: string }[] = [
  { value: "bloqueo", label: "Bloqueo", color: "#dc2626" },
  { value: "vacaciones", label: "Vacaciones", color: "#7c3aed" },
  { value: "formacion", label: "Formación", color: "#0891b2" },
  { value: "comida", label: "Comida", color: "#d97706" },
  { value: "otro", label: "Otro", color: "#6b7280" },
];

function tipoMeta(tipo: string) {
  return TIPOS.find(t => t.value === tipo) ?? TIPOS[TIPOS.length - 1];
}

function fmtDt(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EMPTY_NEW = () => {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const fin = new Date(now.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => toLocalInputValue(d.toISOString());
  return { titulo: "", tipo: "bloqueo", fecha_inicio: fmt(now), fecha_fin: fmt(fin), profesional_id: "", sala_id: "", notas: "" };
};

export default function BloquesTab({
  clinicId,
  profesionales,
  salas,
}: {
  clinicId: string;
  profesionales: Prof[];
  salas: Sala[];
}) {
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch(`/api/clinicas/${clinicId}/bloques`)
      .then(r => r.json())
      .then(data => setBloques(Array.isArray(data) ? data : []))
      .catch(() => setBloques([]))
      .finally(() => setLoadingList(false));
  }, [clinicId]);
  const [form, setForm] = useState(EMPTY_NEW);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function crear() {
    if (!form.titulo.trim()) { setError("El título es obligatorio"); return; }
    if (form.fecha_fin <= form.fecha_inicio) { setError("La fecha de fin debe ser posterior al inicio"); return; }
    setSaving(true); setError("");
    try {
      const body: Record<string, any> = {
        titulo: form.titulo,
        tipo: form.tipo,
        fecha_inicio: new Date(form.fecha_inicio).toISOString(),
        fecha_fin: new Date(form.fecha_fin).toISOString(),
      };
      if (form.profesional_id) body.profesional_id = form.profesional_id;
      if (form.sala_id) body.sala_id = form.sala_id;
      if (form.notas) body.notas = form.notas;

      const res = await fetch(`/api/clinicas/${clinicId}/bloques`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved: Bloque = await res.json();
      setBloques(prev => [saved, ...prev]);
      setCreating(false);
      setForm(EMPTY_NEW());
    } catch (e: any) {
      setError(e.message);
    } finally { setSaving(false); }
  }

  async function eliminar(b: Bloque) {
    if (!confirm(`¿Eliminar el bloqueo "${b.titulo}"?`)) return;
    const res = await fetch(`/api/clinicas/${clinicId}/bloques/${b.id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setBloques(prev => prev.filter(x => x.id !== b.id));
    }
  }

  const sorted = [...bloques].sort((a, b) => a.fecha_inicio < b.fecha_inicio ? 1 : -1);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 13.5 }}>
          {bloques.length} bloqueo{bloques.length !== 1 ? "s" : ""} · El agente no ofrecerá huecos durante estos períodos
        </p>
        <button onClick={() => { setCreating(true); setForm(EMPTY_NEW()); setError(""); }} style={btnPrimaryStyle}>
          + Nuevo bloqueo
        </button>
      </div>

      {loadingList && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af", fontSize: 13.5 }}>
          Cargando bloqueos...
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map(b => {
          const meta = tipoMeta(b.tipo);
          const prof = profesionales.find(p => p.id === b.profesional_id);
          const sala = salas.find(s => s.id === b.sala_id);
          return (
            <div key={b.id} style={{
              background: "white", border: "1px solid #e5e7eb", borderRadius: 10,
              padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 14,
            }}>
              <div style={{
                width: 8, borderRadius: 4, alignSelf: "stretch", flexShrink: 0,
                background: meta.color, minHeight: 40,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{b.titulo}</span>
                  <span style={{
                    fontSize: 11.5, fontWeight: 600, color: meta.color,
                    background: `${meta.color}18`, padding: "2px 8px", borderRadius: 20,
                  }}>
                    {meta.label}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 4 }}>
                  {fmtDt(b.fecha_inicio)} → {fmtDt(b.fecha_fin)}
                  {prof ? ` · ${prof.nombre}` : ""}
                  {sala ? ` · ${sala.nombre}` : ""}
                </div>
                {b.notas && (
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{b.notas}</div>
                )}
              </div>
              <button onClick={() => eliminar(b)} style={{ ...btnGhostStyle, color: "#dc2626", flexShrink: 0 }}>
                Eliminar
              </button>
            </div>
          );
        })}
        {!loadingList && bloques.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>
            Sin bloqueos. Crea uno para períodos de vacaciones, formación o cierres puntuales.
          </div>
        )}
      </div>

      {creating && (
        <div style={overlayStyle} onClick={() => setCreating(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Nuevo bloqueo</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Título *">
                <input
                  style={inputStyle}
                  value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                  placeholder="ej: Vacaciones de verano, Cierre navideño"
                />
              </Field>
              <Field label="Tipo">
                <select style={inputStyle} value={form.tipo}
                  onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
                <Field label="Inicio">
                  <input type="datetime-local" style={inputStyle} value={form.fecha_inicio}
                    onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} />
                </Field>
                <Field label="Fin">
                  <input type="datetime-local" style={inputStyle} value={form.fecha_fin}
                    onChange={e => setForm({ ...form, fecha_fin: e.target.value })} />
                </Field>
              </div>
              {profesionales.length > 0 && (
                <Field label="Profesional afectado (opcional)">
                  <select style={inputStyle} value={form.profesional_id}
                    onChange={e => setForm({ ...form, profesional_id: e.target.value })}>
                    <option value="">Toda la clínica</option>
                    {profesionales.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </Field>
              )}
              {salas.length > 0 && (
                <Field label="Sala afectada (opcional)">
                  <select style={inputStyle} value={form.sala_id}
                    onChange={e => setForm({ ...form, sala_id: e.target.value })}>
                    <option value="">Ninguna</option>
                    {salas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Notas">
                <input style={inputStyle} value={form.notas}
                  onChange={e => setForm({ ...form, notas: e.target.value })}
                  placeholder="Información adicional (opcional)" />
              </Field>
            </div>
            {error && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 12 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setCreating(false)} style={btnGhostStyle}>Cancelar</button>
              <button onClick={crear} disabled={saving} style={btnPrimaryStyle}>
                {saving ? "Guardando..." : "Crear bloqueo"}
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
      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{label}</label>
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
  maxWidth: 520, maxHeight: "90vh", overflowY: "auto",
  boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
};
