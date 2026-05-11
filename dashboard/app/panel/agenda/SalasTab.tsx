"use client";
import { useState } from "react";

type Sala = {
  id: string;
  nombre: string;
  tipo?: string;
  capacidad?: number;
  activo: boolean;
  orden?: number;
};

const TIPOS = ["sala", "box", "cabina", "camilla", "maquina", "otro"];
const EMPTY: Partial<Sala> = { nombre: "", tipo: "sala", capacidad: 1, activo: true, orden: 0 };

export default function SalasTab({
  clinicId, initialSalas,
}: { clinicId: string; initialSalas: Sala[] }) {
  const [salas, setSalas] = useState<Sala[]>(initialSalas);
  const [editing, setEditing] = useState<Sala | Partial<Sala> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!editing?.nombre) { setError("El nombre es obligatorio"); return; }
    setSaving(true); setError("");
    try {
      const isNew = !(editing as Sala).id;
      const url = isNew
        ? `/api/clinicas/${clinicId}/salas`
        : `/api/clinicas/${clinicId}/salas/${(editing as Sala).id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved: Sala = await res.json();
      setSalas(prev => isNew ? [...prev, saved] : prev.map(s => s.id === saved.id ? saved : s));
      setEditing(null);
    } catch (e: any) {
      setError(e.message);
    } finally { setSaving(false); }
  }

  async function toggleActivo(s: Sala) {
    const res = await fetch(`/api/clinicas/${clinicId}/salas/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !s.activo }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSalas(prev => prev.map(x => x.id === updated.id ? updated : x));
    }
  }

  async function eliminar(s: Sala) {
    if (!confirm(`¿Eliminar la sala "${s.nombre}"?`)) return;
    await fetch(`/api/clinicas/${clinicId}/salas/${s.id}`, { method: "DELETE" });
    setSalas(prev => prev.filter(x => x.id !== s.id));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 13.5 }}>
          {salas.filter(s => s.activo).length} salas activas · El agente evita doble-reserva de sala automáticamente
        </p>
        <button onClick={() => setEditing({ ...EMPTY })} style={btnPrimaryStyle}>
          + Nueva sala
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {salas.map(s => (
          <div key={s.id} style={{
            background: "white", border: "1px solid #e5e7eb", borderRadius: 10,
            padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
            opacity: s.activo ? 1 : 0.55,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: "#eff6ff",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <SalaIcon />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{s.nombre}</div>
              <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>
                {s.tipo || "sala"} · Cap. {s.capacidad || 1}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditing({ ...s })} style={btnGhostStyle}>Editar</button>
              <button onClick={() => toggleActivo(s)} style={btnGhostStyle}>
                {s.activo ? "Desactivar" : "Activar"}
              </button>
              <button onClick={() => eliminar(s)} style={{ ...btnGhostStyle, color: "#dc2626" }}>
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {salas.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>
            Sin salas configuradas. Las salas evitan que el agente reserve la misma cabina dos veces.
          </div>
        )}
      </div>

      {editing !== null && (
        <div style={overlayStyle} onClick={() => setEditing(null)}>
          <div style={{ ...modalStyle, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>
              {(editing as Sala).id ? "Editar sala" : "Nueva sala"}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Nombre *">
                <input style={inputStyle} value={editing.nombre ?? ""}
                  onChange={e => setEditing({ ...editing, nombre: e.target.value })}
                  placeholder="ej: Cabina 1, Box 3, Sala de estética" />
              </Field>
              <Field label="Tipo">
                <select style={inputStyle} value={editing.tipo ?? "sala"}
                  onChange={e => setEditing({ ...editing, tipo: e.target.value })}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Capacidad (personas simultáneas)">
                <input type="number" style={inputStyle} value={editing.capacidad ?? 1}
                  onChange={e => setEditing({ ...editing, capacidad: Number(e.target.value) })} min={1} />
              </Field>
              <Field label="Orden (para mostrar en calendario)">
                <input type="number" style={inputStyle} value={editing.orden ?? 0}
                  onChange={e => setEditing({ ...editing, orden: Number(e.target.value) })} />
              </Field>
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

function SalaIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="4" width="14" height="10" rx="1.5" stroke="#2563eb" strokeWidth="1.4" />
      <path d="M5 8h8M5 11h5" stroke="#2563eb" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
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
  maxWidth: 580, maxHeight: "90vh", overflowY: "auto",
  boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
};
