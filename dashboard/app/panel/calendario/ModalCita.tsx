"use client";
import { useState, useEffect } from "react";
import type { CSSProperties } from "react";

export type Cita = {
  id: string;
  tipo_servicio?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  estado: string;
  profesional?: string;
  notas_internas?: string;
  color?: string;
  duracion_min?: number;
  paciente_nombre?: string;
  paciente_telefono?: string;
  pacientes?: { nombre?: string; telefono?: string } | null;
};

export type Profesional = {
  id: string;
  nombre: string;
  color: string;
  especialidad?: string;
};

export type ModalMode =
  | { type: "nueva"; slotDate: Date; slotHour: number; slotProfesional?: string }
  | { type: "ver"; cita: Cita }
  | { type: "bloquear"; slotDate?: Date }
  | { type: "profesionales" };

const ESTADOS = [
  { value: "pendiente", label: "Pendiente", color: "#854d0e", bg: "#fef9c3" },
  { value: "confirmada", label: "Confirmada", color: "#166534", bg: "#dcfce7" },
  { value: "completada", label: "Completada", color: "#3730a3", bg: "#e0e7ff" },
  { value: "cancelada", label: "Cancelada", color: "#991b1b", bg: "#fee2e2" },
  { value: "no_asistio", label: "No asistió", color: "#374151", bg: "#f3f4f6" },
];

const TIPOS_BLOQUEO = [
  { value: "bloqueo", label: "Bloqueo general" },
  { value: "vacaciones", label: "Vacaciones" },
  { value: "formacion", label: "Formación" },
  { value: "otro", label: "Otro" },
];

const DURACIONES = [15, 20, 30, 45, 60, 90, 120];

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function buildSlotISO(date: Date, hour: number): string {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export default function ModalCita({
  mode,
  clinicId,
  profesionales,
  onClose,
  onSaved,
}: {
  mode: ModalMode;
  clinicId: string;
  profesionales: Profesional[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNueva = mode.type === "nueva";
  const isVer = mode.type === "ver";
  const isBloquear = mode.type === "bloquear";
  const isProfs = mode.type === "profesionales";

  // ── Cita form state ──────────────────────────────────────
  const initialCita = isVer ? mode.cita : null;
  const [editing, setEditing] = useState(isNueva);
  const [pacNombre, setPacNombre] = useState(initialCita?.paciente_nombre || initialCita?.pacientes?.nombre || "");
  const [pacTelefono, setPacTelefono] = useState(initialCita?.paciente_telefono || initialCita?.pacientes?.telefono || "");
  const [servicio, setServicio] = useState(initialCita?.tipo_servicio || "");
  const [prof, setProf] = useState(
    initialCita?.profesional ||
    (isNueva && mode.type === "nueva" ? mode.slotProfesional || "" : "")
  );
  const [estado, setEstado] = useState(initialCita?.estado || "confirmada");
  const [duracion, setDuracion] = useState(initialCita?.duracion_min || 60);
  const [notas, setNotas] = useState(initialCita?.notas_internas || "");
  const [fechaInicio, setFechaInicio] = useState(() => {
    if (isVer && initialCita) return toLocalDatetimeValue(initialCita.fecha_inicio);
    if (isNueva && mode.type === "nueva") return toLocalDatetimeValue(buildSlotISO(mode.slotDate, mode.slotHour));
    return toLocalDatetimeValue(new Date().toISOString());
  });

  // ── Bloqueo form state ────────────────────────────────────
  const [bloqTitulo, setBloqTitulo] = useState("");
  const [bloqProf, setBloqProf] = useState("");
  const [bloqTipo, setBloqTipo] = useState("bloqueo");
  const [bloqInicio, setBloqInicio] = useState(() => {
    if (isBloquear && mode.type === "bloquear" && mode.slotDate) {
      return toLocalDatetimeValue(mode.slotDate.toISOString());
    }
    const d = new Date(); d.setMinutes(0, 0, 0);
    return toLocalDatetimeValue(d.toISOString());
  });
  const [bloqFin, setBloqFin] = useState(() => {
    const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0);
    return toLocalDatetimeValue(d.toISOString());
  });

  // ── Profesionales form state ──────────────────────────────
  const [profsList, setProfsList] = useState<Profesional[]>(profesionales);
  const [profNombre, setProfNombre] = useState("");
  const [profColor, setProfColor] = useState("#2563eb");
  const [profEspecialidad, setProfEspecialidad] = useState("");

  const PROF_COLORS_LIST = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#db2777", "#374151"];

  // ── Shared state ──────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // ── Compute fecha_fin from fecha_inicio + duracion ────────
  function computeFechaFin(inicio: string, minutos: number): string {
    const d = new Date(inicio);
    d.setMinutes(d.getMinutes() + minutos);
    return d.toISOString();
  }

  // ── Save cita ─────────────────────────────────────────────
  const saveCita = async () => {
    if (!fechaInicio) { setError("Selecciona fecha y hora"); return; }
    setSaving(true); setError("");
    const body = {
      paciente_nombre: pacNombre || null,
      paciente_telefono: pacTelefono || null,
      tipo_servicio: servicio || null,
      profesional: prof || null,
      estado,
      duracion_min: duracion,
      fecha_inicio: new Date(fechaInicio).toISOString(),
      fecha_fin: computeFechaFin(fechaInicio, duracion),
      notas_internas: notas || null,
    };
    try {
      const url = isVer
        ? `/api/clinicas/${clinicId}/citas/${initialCita!.id}`
        : `/api/clinicas/${clinicId}/citas`;
      const res = await fetch(url, {
        method: isVer ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Error al guardar");
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally { setSaving(false); }
  };

  // ── Delete cita ───────────────────────────────────────────
  const deleteCita = async () => {
    if (!confirm("¿Eliminar esta cita?")) return;
    setDeleting(true); setError("");
    try {
      const res = await fetch(`/api/clinicas/${clinicId}/citas/${initialCita!.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      onSaved(); onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    } finally { setDeleting(false); }
  };

  // ── Quick status change ───────────────────────────────────
  const changeStatus = async (newEstado: string) => {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/clinicas/${clinicId}/citas/${initialCita!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: newEstado }),
      });
      if (!res.ok) throw new Error("Error al cambiar estado");
      setEstado(newEstado);
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setSaving(false); }
  };

  // ── Save bloqueo ──────────────────────────────────────────
  const saveBloqueo = async () => {
    if (!bloqTitulo) { setError("Introduce un título"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/clinicas/${clinicId}/bloques`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: bloqTitulo,
          profesional: bloqProf || null,
          tipo: bloqTipo,
          fecha_inicio: new Date(bloqInicio).toISOString(),
          fecha_fin: new Date(bloqFin).toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Error al crear bloqueo");
      onSaved(); onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setSaving(false); }
  };

  // ── Add profesional ───────────────────────────────────────
  const addProfesional = async () => {
    if (!profNombre) { setError("Introduce el nombre"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/clinicas/${clinicId}/profesionales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: profNombre, color: profColor, especialidad: profEspecialidad || null }),
      });
      if (!res.ok) throw new Error("Error al crear profesional");
      const nuevo = await res.json();
      setProfsList(p => [...p, nuevo]);
      setProfNombre(""); setProfColor("#2563eb"); setProfEspecialidad("");
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setSaving(false); }
  };

  const removeProfesional = async (profId: string) => {
    const res = await fetch(`/api/clinicas/${clinicId}/profesionales/${profId}`, { method: "DELETE" });
    if (res.ok) { setProfsList(p => p.filter(x => x.id !== profId)); onSaved(); }
  };

  // ── Estado del cita en modo vista ────────────────────────
  const estadoInfo = ESTADOS.find(e => e.value === estado) || ESTADOS[0];

  // ── Title ────────────────────────────────────────────────
  const title = isProfs ? "Gestionar profesionales"
    : isBloquear ? "Bloquear agenda"
    : isVer && !editing ? "Detalle de cita"
    : isVer && editing ? "Editar cita"
    : "Nueva cita";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "white", borderRadius: 16,
          width: "100%", maxWidth: isProfs ? 520 : 480,
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
          maxHeight: "90vh", overflow: "auto",
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111827" }}>{title}</h2>
          <button onClick={onClose} style={iconBtnSt}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {error && <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

          {/* ── VIEW MODE (no editing) ── */}
          {isVer && !editing && (
            <>
              {/* Status pills */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {ESTADOS.map(e => (
                  <button key={e.value} onClick={() => changeStatus(e.value)} style={{
                    padding: "5px 12px", borderRadius: 20, border: `2px solid ${estado === e.value ? e.color : "transparent"}`,
                    background: e.bg, color: e.color, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                    opacity: saving ? 0.6 : 1,
                  }}>
                    {e.label}
                  </button>
                ))}
              </div>

              {/* Info rows */}
              {(initialCita?.paciente_nombre || initialCita?.pacientes?.nombre) && (
                <InfoRow icon="👤" label="Paciente" value={initialCita.paciente_nombre || initialCita.pacientes?.nombre || ""} />
              )}
              {(initialCita?.paciente_telefono || initialCita?.pacientes?.telefono) && (
                <InfoRow icon="📞" label="Teléfono" value={initialCita.paciente_telefono || initialCita.pacientes?.telefono || ""} />
              )}
              {initialCita?.tipo_servicio && <InfoRow icon="🩺" label="Servicio" value={initialCita.tipo_servicio} />}
              {initialCita?.profesional && <InfoRow icon="👨‍⚕️" label="Profesional" value={initialCita.profesional} />}
              <InfoRow icon="📅" label="Fecha"
                value={new Date(initialCita!.fecha_inicio).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              />
              <InfoRow icon="🕐" label="Hora"
                value={`${new Date(initialCita!.fecha_inicio).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}${initialCita?.fecha_fin ? ` — ${new Date(initialCita.fecha_fin).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}` : ""}`}
              />
              {initialCita?.duracion_min && <InfoRow icon="⏱" label="Duración" value={`${initialCita.duracion_min} min`} />}
              {initialCita?.notas_internas && <InfoRow icon="📝" label="Notas internas" value={initialCita.notas_internas} />}

              <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
                <button onClick={() => setEditing(true)} style={{ ...btnPrimary, flex: 1 }}>Editar</button>
                <button onClick={deleteCita} disabled={deleting} style={{ ...btnDanger, flex: "0 0 auto" }}>
                  {deleting ? "…" : "Eliminar"}
                </button>
              </div>
            </>
          )}

          {/* ── EDIT / NUEVA FORM ── */}
          {(isNueva || (isVer && editing)) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Nombre del paciente">
                  <input value={pacNombre} onChange={e => setPacNombre(e.target.value)} placeholder="Ej: Ana García" style={inputSt} />
                </Field>
                <Field label="Teléfono">
                  <input value={pacTelefono} onChange={e => setPacTelefono(e.target.value)} placeholder="+34 600 000 000" style={inputSt} />
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Servicio">
                  <input value={servicio} onChange={e => setServicio(e.target.value)} placeholder="Ej: Limpieza dental" style={inputSt} />
                </Field>
                <Field label="Profesional">
                  <select value={prof} onChange={e => setProf(e.target.value)} style={{ ...inputSt, cursor: "pointer" }}>
                    <option value="">Sin asignar</option>
                    {profesionales.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Fecha y hora">
                  <input type="datetime-local" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={inputSt} />
                </Field>
                <Field label="Duración">
                  <select value={duracion} onChange={e => setDuracion(Number(e.target.value))} style={{ ...inputSt, cursor: "pointer" }}>
                    {DURACIONES.map(d => <option key={d} value={d}>{d} min</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Estado">
                <select value={estado} onChange={e => setEstado(e.target.value)} style={{ ...inputSt, cursor: "pointer" }}>
                  {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </Field>
              <Field label="Notas internas">
                <textarea value={notas} onChange={e => setNotas(e.target.value)}
                  rows={3} placeholder="Notas visibles solo para la clínica..."
                  style={{ ...inputSt, resize: "vertical", lineHeight: 1.5 }}
                />
              </Field>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={saveCita} disabled={saving} style={{ ...btnPrimary, flex: 1 }}>
                  {saving ? "Guardando…" : isVer ? "Guardar cambios" : "Crear cita"}
                </button>
                {isVer && <button onClick={() => setEditing(false)} style={{ ...btnSecondary, flex: "0 0 auto" }}>Cancelar</button>}
              </div>
            </div>
          )}

          {/* ── BLOQUEAR ── */}
          {isBloquear && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Título del bloqueo *">
                <input value={bloqTitulo} onChange={e => setBloqTitulo(e.target.value)} placeholder="Ej: Vacaciones, Reunión..." style={inputSt} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Desde">
                  <input type="datetime-local" value={bloqInicio} onChange={e => setBloqInicio(e.target.value)} style={inputSt} />
                </Field>
                <Field label="Hasta">
                  <input type="datetime-local" value={bloqFin} onChange={e => setBloqFin(e.target.value)} style={inputSt} />
                </Field>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Tipo">
                  <select value={bloqTipo} onChange={e => setBloqTipo(e.target.value)} style={{ ...inputSt, cursor: "pointer" }}>
                    {TIPOS_BLOQUEO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Profesional (opcional)">
                  <select value={bloqProf} onChange={e => setBloqProf(e.target.value)} style={{ ...inputSt, cursor: "pointer" }}>
                    <option value="">Toda la clínica</option>
                    {profesionales.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                  </select>
                </Field>
              </div>
              <button onClick={saveBloqueo} disabled={saving} style={{ ...btnPrimary, marginTop: 4 }}>
                {saving ? "Guardando…" : "Crear bloqueo"}
              </button>
            </div>
          )}

          {/* ── PROFESIONALES ── */}
          {isProfs && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Existing */}
              {profsList.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "#374151" }}>Profesionales activos</p>
                  {profsList.map(p => (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", background: "#f9fafb", borderRadius: 8, marginBottom: 6,
                    }}>
                      <span style={{ width: 12, height: 12, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#111827" }}>{p.nombre}</div>
                        {p.especialidad && <div style={{ fontSize: 12, color: "#9ca3af" }}>{p.especialidad}</div>}
                      </div>
                      <button onClick={() => removeProfesional(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18, lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new */}
              <div>
                <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "#374151" }}>Añadir profesional</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end" }}>
                    <Field label="Nombre *">
                      <input value={profNombre} onChange={e => setProfNombre(e.target.value)} placeholder="Ej: Dr. García" style={inputSt} />
                    </Field>
                    <div style={{ paddingBottom: 2 }}>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Color</div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {PROF_COLORS_LIST.map(c => (
                          <button key={c} onClick={() => setProfColor(c)} style={{
                            width: 22, height: 22, borderRadius: "50%", background: c, border: profColor === c ? "2px solid #111827" : "2px solid transparent", cursor: "pointer",
                          }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <Field label="Especialidad (opcional)">
                    <input value={profEspecialidad} onChange={e => setProfEspecialidad(e.target.value)} placeholder="Ej: Higienista dental" style={inputSt} />
                  </Field>
                  <button onClick={addProfesional} disabled={saving} style={btnPrimary}>
                    {saving ? "Guardando…" : "+ Añadir profesional"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid #f9fafb" }}>
      <span style={{ fontSize: 15, width: 20, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
        <div style={{ fontSize: 13.5, color: "#111827", marginTop: 1 }}>{value}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "#374151" }}>{label}</span>
      {children}
    </label>
  );
}

const inputSt: CSSProperties = {
  width: "100%", padding: "9px 12px", border: "1px solid #d1d5db",
  borderRadius: 8, fontSize: 13.5, color: "#111827", background: "white",
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

const iconBtnSt: CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  padding: 6, borderRadius: 6, display: "flex", alignItems: "center",
};

const btnPrimary: CSSProperties = {
  background: "linear-gradient(135deg, #2563eb, #4f46e5)",
  color: "white", border: "none", borderRadius: 9,
  padding: "11px 18px", fontSize: 14, fontWeight: 600,
  cursor: "pointer", width: "100%",
};

const btnSecondary: CSSProperties = {
  background: "white", color: "#374151",
  border: "1px solid #d1d5db", borderRadius: 9,
  padding: "11px 18px", fontSize: 14, fontWeight: 500,
  cursor: "pointer",
};

const btnDanger: CSSProperties = {
  background: "#fee2e2", color: "#991b1b",
  border: "1px solid #fca5a5", borderRadius: 9,
  padding: "11px 16px", fontSize: 14, fontWeight: 600,
  cursor: "pointer",
};
