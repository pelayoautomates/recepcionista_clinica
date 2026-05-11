"use client";
import { useState } from "react";

type Servicio = {
  id: string;
  nombre: string;
  duracion_min: number;
  precio?: number | null;
  buffer_antes_min?: number;
  buffer_despues_min?: number;
  reservable_ia?: boolean;
  requiere_revision?: boolean;
  categoria?: string | null;
  sala_id?: string | null;
  activo: boolean;
  color?: string | null;
};

type Sala = { id: string; nombre: string };

const COLORES = ["#2563eb", "#7c3aed", "#059669", "#dc2626", "#d97706", "#0891b2", "#9333ea", "#65a30d"];

const EMPTY: Partial<Servicio> = {
  nombre: "", duracion_min: 30, precio: null, buffer_antes_min: 0, buffer_despues_min: 0,
  reservable_ia: true, requiere_revision: false, categoria: "", sala_id: null,
  color: "#2563eb", activo: true,
};

export default function ServiciosTab({
  clinicId, initialServicios, salas,
}: { clinicId: string; initialServicios: Servicio[]; salas: Sala[] }) {
  const [servicios, setServicios] = useState<Servicio[]>(initialServicios);
  const [editing, setEditing] = useState<Servicio | Partial<Servicio> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!editing?.nombre) { setError("El nombre es obligatorio"); return; }
    setSaving(true); setError("");
    try {
      const isNew = !(editing as Servicio).id;
      const url = isNew
        ? `/api/clinicas/${clinicId}/servicios`
        : `/api/clinicas/${clinicId}/servicios/${(editing as Servicio).id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved: Servicio = await res.json();
      setServicios(prev =>
        isNew ? [...prev, saved] : prev.map(s => s.id === saved.id ? saved : s)
      );
      setEditing(null);
    } catch (e: any) {
      setError(e.message);
    } finally { setSaving(false); }
  }

  async function toggleActivo(s: Servicio) {
    const res = await fetch(`/api/clinicas/${clinicId}/servicios/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !s.activo }),
    });
    if (res.ok) {
      const updated = await res.json();
      setServicios(prev => prev.map(x => x.id === updated.id ? updated : x));
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 13.5 }}>
          {servicios.filter(s => s.activo).length} servicios activos
        </p>
        <button onClick={() => setEditing({ ...EMPTY })} style={btnPrimaryStyle}>
          + Nuevo servicio
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {servicios.map(s => (
          <div key={s.id} style={{
            background: "white", border: "1px solid #e5e7eb", borderRadius: 10,
            padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
            opacity: s.activo ? 1 : 0.55,
          }}>
            <div style={{
              width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
              background: s.color || "#2563eb",
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{s.nombre}</div>
              <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>
                {s.duracion_min} min
                {s.precio != null ? ` · ${s.precio}€` : ""}
                {s.buffer_antes_min || s.buffer_despues_min
                  ? ` · buffer ${s.buffer_antes_min ?? 0}/${s.buffer_despues_min ?? 0} min`
                  : ""}
                {!s.reservable_ia ? " · Solo manual" : ""}
                {s.requiere_revision ? " · Requiere revisión" : ""}
                {s.categoria ? ` · ${s.categoria}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setEditing({ ...s })} style={btnGhostStyle}>Editar</button>
              <button onClick={() => toggleActivo(s)} style={btnGhostStyle}>
                {s.activo ? "Desactivar" : "Activar"}
              </button>
            </div>
          </div>
        ))}
        {servicios.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>
            Sin servicios. Añade el primero.
          </div>
        )}
      </div>

      {/* Modal edición */}
      {editing !== null && (
        <div style={overlayStyle} onClick={() => setEditing(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>
              {(editing as Servicio).id ? "Editar servicio" : "Nuevo servicio"}
            </h3>

            <div style={gridStyle}>
              <Field label="Nombre *">
                <input style={inputStyle} value={editing.nombre ?? ""} onChange={e => setEditing({ ...editing, nombre: e.target.value })} />
              </Field>
              <Field label="Duración (min)">
                <input type="number" style={inputStyle} value={editing.duracion_min ?? 30}
                  onChange={e => setEditing({ ...editing, duracion_min: Number(e.target.value) })} min={5} step={5} />
              </Field>
              <Field label="Precio (€)">
                <input type="number" style={inputStyle} value={editing.precio ?? ""}
                  onChange={e => setEditing({ ...editing, precio: e.target.value ? Number(e.target.value) : null })} min={0} step={0.01} />
              </Field>
              <Field label="Categoría">
                <input style={inputStyle} value={editing.categoria ?? ""}
                  onChange={e => setEditing({ ...editing, categoria: e.target.value })} placeholder="ej: Estética, Diagnóstico" />
              </Field>
              <Field label="Buffer antes (min)">
                <input type="number" style={inputStyle} value={editing.buffer_antes_min ?? 0}
                  onChange={e => setEditing({ ...editing, buffer_antes_min: Number(e.target.value) })} min={0} step={5} />
              </Field>
              <Field label="Buffer después (min)">
                <input type="number" style={inputStyle} value={editing.buffer_despues_min ?? 0}
                  onChange={e => setEditing({ ...editing, buffer_despues_min: Number(e.target.value) })} min={0} step={5} />
              </Field>
              {salas.length > 0 && (
                <Field label="Sala asignada">
                  <select style={inputStyle} value={editing.sala_id ?? ""}
                    onChange={e => setEditing({ ...editing, sala_id: e.target.value || null })}>
                    <option value="">Sin sala fija</option>
                    {salas.map(sala => (
                      <option key={sala.id} value={sala.id}>{sala.nombre}</option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Color">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {COLORES.map(c => (
                    <button key={c} onClick={() => setEditing({ ...editing, color: c })} style={{
                      width: 24, height: 24, borderRadius: "50%", background: c, border: editing.color === c ? "3px solid #111" : "2px solid transparent", cursor: "pointer",
                    }} />
                  ))}
                </div>
              </Field>
            </div>

            <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer" }}>
                <input type="checkbox" checked={!!editing.reservable_ia}
                  onChange={e => setEditing({ ...editing, reservable_ia: e.target.checked })} />
                El agente puede reservar este servicio
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer" }}>
                <input type="checkbox" checked={!!editing.requiere_revision}
                  onChange={e => setEditing({ ...editing, requiere_revision: e.target.checked })} />
                Requiere revisión humana
              </label>
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
const gridStyle: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px",
};
