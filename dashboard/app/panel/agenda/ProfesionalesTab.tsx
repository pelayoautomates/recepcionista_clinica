"use client";
import { useState } from "react";

type Prof = {
  id: string;
  nombre: string;
  especialidad?: string | null;
  email?: string | null;
  telefono?: string | null;
  color?: string;
  acepta_reservas_ia?: boolean;
  prioridad?: number;
  activo: boolean;
};

type Servicio = { id: string; nombre: string };

const DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const COLORES = ["#2563eb", "#7c3aed", "#059669", "#dc2626", "#d97706", "#0891b2", "#9333ea", "#65a30d"];

const EMPTY: Partial<Prof> = {
  nombre: "", especialidad: "", email: "", telefono: "",
  color: "#2563eb", acepta_reservas_ia: true, prioridad: 0, activo: true,
};

export default function ProfesionalesTab({
  clinicId, initialProfesionales, servicios,
}: { clinicId: string; initialProfesionales: Prof[]; servicios: Servicio[] }) {
  const [profesionales, setProfesionales] = useState<Prof[]>(initialProfesionales);
  const [editing, setEditing] = useState<Prof | Partial<Prof> | null>(null);
  const [showDisp, setShowDisp] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function save() {
    if (!editing?.nombre) { setError("El nombre es obligatorio"); return; }
    setSaving(true); setError(""); setNotice(null);
    try {
      const isNew = !(editing as Prof).id;
      const url = isNew
        ? `/api/clinicas/${clinicId}/profesionales`
        : `/api/clinicas/${clinicId}/profesionales/${(editing as Prof).id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved: Prof = await res.json();
      setProfesionales(prev =>
        isNew ? [...prev, saved] : prev.map(p => p.id === saved.id ? saved : p)
      );
      setEditing(null);
      setNotice({ type: "success", text: "Profesional guardado correctamente." });
    } catch (e: any) {
      setError(e.message);
      setNotice({ type: "error", text: "No se pudo guardar el profesional." });
    } finally { setSaving(false); }
  }

  async function toggleActivo(p: Prof) {
    setNotice(null);
    const res = await fetch(`/api/clinicas/${clinicId}/profesionales/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !p.activo }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProfesionales(prev => prev.map(x => x.id === updated.id ? updated : x));
      setNotice({ type: "success", text: `Profesional ${updated.activo ? "activado" : "desactivado"}.` });
      return;
    }
    setNotice({ type: "error", text: "No se pudo actualizar el estado del profesional." });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 13.5 }}>
          {profesionales.filter(p => p.activo).length} profesionales activos
        </p>
        <button onClick={() => setEditing({ ...EMPTY })} style={btnPrimaryStyle}>
          + Nuevo profesional
        </button>
      </div>
      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          style={{
            marginBottom: 12,
            fontSize: 12.5,
            padding: "8px 10px",
            borderRadius: 8,
            color: notice.type === "error" ? "#b91c1c" : "#166534",
            background: notice.type === "error" ? "#fee2e2" : "#dcfce7",
            border: `1px solid ${notice.type === "error" ? "#fecaca" : "#bbf7d0"}`,
            fontWeight: 500,
          }}
        >
          {notice.text}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {profesionales.map(p => (
          <div key={p.id} style={{
            background: "white", border: "1px solid #e5e7eb", borderRadius: 10,
            padding: "14px 18px", opacity: p.activo ? 1 : 0.55,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%", background: p.color || "#2563eb",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}>
                {p.nombre.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{p.nombre}</div>
                <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>
                  {p.especialidad || "Sin especialidad"}
                  {p.email ? ` · ${p.email}` : ""}
                  {!p.acepta_reservas_ia ? " · No acepta IA" : ""}
                  {p.prioridad ? ` · Prioridad ${p.prioridad}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowDisp(showDisp === p.id ? null : p.id)} style={btnGhostStyle}>
                  Horario
                </button>
                <button onClick={() => setEditing({ ...p })} style={btnGhostStyle}>Editar</button>
                <button onClick={() => toggleActivo(p)} style={btnGhostStyle}>
                  {p.activo ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
            {showDisp === p.id && (
              <DisponibilidadEditor clinicId={clinicId} profesionalId={p.id} />
            )}
          </div>
        ))}
        {profesionales.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 14 }}>
            Sin profesionales. Añade el primero.
          </div>
        )}
      </div>

      {editing !== null && (
        <div style={overlayStyle} onClick={() => setEditing(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>
              {(editing as Prof).id ? "Editar profesional" : "Nuevo profesional"}
            </h3>
            <div style={gridStyle}>
              <Field label="Nombre *">
                <input style={inputStyle} value={editing.nombre ?? ""} onChange={e => setEditing({ ...editing, nombre: e.target.value })} />
              </Field>
              <Field label="Especialidad">
                <input style={inputStyle} value={editing.especialidad ?? ""} onChange={e => setEditing({ ...editing, especialidad: e.target.value })} />
              </Field>
              <Field label="Email">
                <input type="email" style={inputStyle} value={editing.email ?? ""} onChange={e => setEditing({ ...editing, email: e.target.value })} />
              </Field>
              <Field label="Teléfono">
                <input style={inputStyle} value={editing.telefono ?? ""} onChange={e => setEditing({ ...editing, telefono: e.target.value })} />
              </Field>
              <Field label="Prioridad (mayor = primero)">
                <input type="number" style={inputStyle} value={editing.prioridad ?? 0} onChange={e => setEditing({ ...editing, prioridad: Number(e.target.value) })} />
              </Field>
              <Field label="Color">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 4 }}>
                  {COLORES.map(c => (
                    <button key={c} onClick={() => setEditing({ ...editing, color: c })} style={{
                      width: 24, height: 24, borderRadius: "50%", background: c,
                      border: editing.color === c ? "3px solid #111" : "2px solid transparent", cursor: "pointer",
                    }} />
                  ))}
                </div>
              </Field>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer", marginTop: 14 }}>
              <input type="checkbox" checked={!!editing.acepta_reservas_ia}
                onChange={e => setEditing({ ...editing, acepta_reservas_ia: e.target.checked })} />
              El agente IA puede asignarle citas automáticamente
            </label>
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

type DispRow = { dia_semana: number; activo: boolean; hora_inicio: string; hora_fin: string };

function DisponibilidadEditor({ clinicId, profesionalId }: { clinicId: string; profesionalId: string }) {
  const [rows, setRows] = useState<DispRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/clinicas/${clinicId}/profesionales/${profesionalId}/disponibilidad`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const source = Array.isArray(data) ? data : [];
      const loaded: DispRow[] = Array.from({ length: 7 }, (_, i) => {
        const found = source.find((d: any) => d.dia_semana === i);
        return found
          ? { dia_semana: i, activo: found.activo ?? true, hora_inicio: found.hora_inicio || "09:00", hora_fin: found.hora_fin || "18:00" }
          : { dia_semana: i, activo: false, hora_inicio: "09:00", hora_fin: "18:00" };
      });
      setRows(loaded);
    } catch {
      setNotice({ type: "error", text: "No se pudo cargar la disponibilidad." });
    } finally {
      setLoading(false);
    }
  }

  async function saveDays() {
    if (!rows) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/clinicas/${clinicId}/profesionales/${profesionalId}/disponibilidad`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horarios: rows }),
      });
      if (!res.ok) throw new Error(await res.text());
      setNotice({ type: "success", text: "Horario guardado correctamente." });
    } catch {
      setNotice({ type: "error", text: "No se pudo guardar el horario." });
    } finally {
      setSaving(false);
    }
  }

  if (rows === null) {
    return (
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f3f4f6" }}>
        <button onClick={load} disabled={loading} style={{ ...btnGhostStyle, fontSize: 12.5 }}>
          {loading ? "Cargando..." : "Cargar horario semanal"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f3f4f6" }}>
      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          style={{
            marginBottom: 10,
            fontSize: 12,
            padding: "7px 9px",
            borderRadius: 8,
            color: notice.type === "error" ? "#b91c1c" : "#166534",
            background: notice.type === "error" ? "#fee2e2" : "#dcfce7",
            border: `1px solid ${notice.type === "error" ? "#fecaca" : "#bbf7d0"}`,
            fontWeight: 500,
          }}
        >
          {notice.text}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, width: 80, fontSize: 13 }}>
              <input type="checkbox" checked={row.activo}
                onChange={e => {
                  const next = [...rows];
                  next[i] = { ...row, activo: e.target.checked };
                  setRows(next);
                }} />
              {DIAS[i]}
            </label>
            <input type="time" value={row.hora_inicio} disabled={!row.activo} style={{ ...inputStyle, width: 100, opacity: row.activo ? 1 : 0.4 }}
              onChange={e => { const next = [...rows]; next[i] = { ...row, hora_inicio: e.target.value }; setRows(next); }} />
            <span style={{ color: "#9ca3af", fontSize: 12 }}>–</span>
            <input type="time" value={row.hora_fin} disabled={!row.activo} style={{ ...inputStyle, width: 100, opacity: row.activo ? 1 : 0.4 }}
              onChange={e => { const next = [...rows]; next[i] = { ...row, hora_fin: e.target.value }; setRows(next); }} />
          </div>
        ))}
      </div>
      <button onClick={saveDays} disabled={saving} style={{ ...btnPrimaryStyle, marginTop: 12, fontSize: 12.5 }}>
        {saving ? "Guardando..." : "Guardar horario"}
      </button>
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
  maxWidth: 540, maxHeight: "90vh", overflowY: "auto",
  boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
};
const gridStyle: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px",
};
