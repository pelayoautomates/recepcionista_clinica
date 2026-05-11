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
  origen?: string;
  pacientes?: { nombre?: string; telefono?: string } | null;
};

export type Profesional = {
  id: string;
  nombre: string;
  color: string;
  especialidad?: string;
};

export type Servicio = {
  id: string;
  nombre: string;
  duracion_min: number;
  color?: string;
  descripcion?: string;
  precio?: number;
  buffer_antes_min?: number;
  buffer_despues_min?: number;
  reservable_ia?: boolean;
  requiere_revision?: boolean;
  categoria?: string;
  sala_id?: string | null;
};

export type Sala = {
  id: string;
  nombre: string;
  tipo: string;
  capacidad: number;
};

export type ModalMode =
  | { type: "nueva"; slotDate: Date; slotHour: number; slotProfesional?: string }
  | { type: "ver"; cita: Cita }
  | { type: "bloquear"; slotDate?: Date }
  | { type: "profesionales" }
  | { type: "servicios" };

const ESTADOS = [
  { value: "pendiente",     label: "Pendiente",     color: "#854d0e", bg: "#fef9c3" },
  { value: "confirmada",    label: "Confirmada",    color: "#166534", bg: "#dcfce7" },
  { value: "reprogramada",  label: "Reprogramada",  color: "#1e40af", bg: "#dbeafe" },
  { value: "completada",    label: "Completada",    color: "#3730a3", bg: "#e0e7ff" },
  { value: "cancelada",     label: "Cancelada",     color: "#991b1b", bg: "#fee2e2" },
  { value: "no_asistio",    label: "No asistió",    color: "#374151", bg: "#f3f4f6" },
];

const ORIGENES = [
  { value: "manual",          label: "Manual (recepción)" },
  { value: "ia_llamada",      label: "IA — Llamada" },
  { value: "ia_whatsapp",     label: "IA — WhatsApp" },
  { value: "ia_chat",         label: "IA — Chat web" },
  { value: "google_calendar", label: "Google Calendar" },
];

const TIPOS_BLOQUEO = [
  { value: "bloqueo",      label: "Bloqueo general" },
  { value: "vacaciones",   label: "Vacaciones" },
  { value: "formacion",    label: "Formación" },
  { value: "comida",       label: "Comida / descanso" },
  { value: "reunion",      label: "Reunión" },
  { value: "festivo",      label: "Festivo" },
  { value: "mantenimiento",label: "Mantenimiento" },
  { value: "ausencia",     label: "Ausencia" },
  { value: "otro",         label: "Otro" },
];

const ESTADOS_EXTRA = [
  { value: "requiere_revision", label: "Requiere revisión", color: "#92400e", bg: "#fef3c7" },
  { value: "sync_failed",       label: "Error sincronización", color: "#7f1d1d", bg: "#fce7f3" },
];

const DURACIONES = [15, 20, 30, 45, 60, 90, 120];
const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const PROF_COLORS_LIST = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#db2777", "#374151"];

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

function computeFechaFin(inicio: string, minutos: number): string {
  const d = new Date(inicio);
  d.setMinutes(d.getMinutes() + minutos);
  return d.toISOString();
}

// ─── Disponibilidad type ─────────────────────────────────────────────────────
type DisponibilidadRow = {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
};

const defaultDisponibilidad = (): DisponibilidadRow[] =>
  DIAS_SEMANA.map((_, i) => ({
    dia_semana: i,
    hora_inicio: "09:00",
    hora_fin: "17:00",
    activo: i < 5,
  }));

// ─── Main component ──────────────────────────────────────────────────────────
export default function ModalCita({
  mode,
  clinicId,
  profesionales,
  servicios,
  salas = [],
  onClose,
  onSaved,
}: {
  mode: ModalMode;
  clinicId: string;
  profesionales: Profesional[];
  servicios: Servicio[];
  salas?: Sala[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNueva     = mode.type === "nueva";
  const isVer       = mode.type === "ver";
  const isBloquear  = mode.type === "bloquear";
  const isProfs     = mode.type === "profesionales";
  const isServicios = mode.type === "servicios";

  // ── Cita form state ──────────────────────────────────────────────────────
  const initialCita = isVer ? mode.cita : null;
  const [editing, setEditing]         = useState(isNueva);
  const [pacNombre, setPacNombre]     = useState(initialCita?.paciente_nombre || initialCita?.pacientes?.nombre || "");
  const [pacTelefono, setPacTelefono] = useState(initialCita?.paciente_telefono || initialCita?.pacientes?.telefono || "");
  const [servicio, setServicio]       = useState(initialCita?.tipo_servicio || "");
  const [prof, setProf]               = useState(
    initialCita?.profesional ||
    (isNueva && mode.type === "nueva" ? mode.slotProfesional || "" : "")
  );
  const [estado, setEstado]           = useState(initialCita?.estado || "confirmada");
  const [duracion, setDuracion]       = useState(initialCita?.duracion_min || 30);
  const [notas, setNotas]             = useState(initialCita?.notas_internas || "");
  const [origen, setOrigen]           = useState(initialCita?.origen || "manual");
  const [salaId, setSalaId]           = useState<string>((initialCita as { sala_id?: string })?.sala_id || "");
  const [fechaInicio, setFechaInicio] = useState(() => {
    if (isVer && initialCita) return toLocalDatetimeValue(initialCita.fecha_inicio);
    if (isNueva && mode.type === "nueva") return toLocalDatetimeValue(buildSlotISO(mode.slotDate, mode.slotHour));
    return toLocalDatetimeValue(new Date().toISOString());
  });

  // Cuando se elige servicio del catálogo, auto-rellenar duración
  function handleServicioChange(nombre: string) {
    setServicio(nombre);
    const found = servicios.find(s => s.nombre === nombre);
    if (found) setDuracion(found.duracion_min);
  }

  // ── Bloqueo form state ───────────────────────────────────────────────────
  const [bloqTitulo, setBloqTitulo] = useState("");
  const [bloqProf, setBloqProf]     = useState("");
  const [bloqTipo, setBloqTipo]     = useState("bloqueo");
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

  // ── Profesionales state ──────────────────────────────────────────────────
  const [profsList, setProfsList]         = useState<Profesional[]>(profesionales);
  const [profNombre, setProfNombre]       = useState("");
  const [profColor, setProfColor]         = useState("#2563eb");
  const [profEspecialidad, setProfEspecialidad] = useState("");
  const [editingProfId, setEditingProfId] = useState<string | null>(null);
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadRow[]>(defaultDisponibilidad());
  const [loadingDisp, setLoadingDisp]     = useState(false);

  async function loadDisponibilidad(profId: string) {
    setLoadingDisp(true);
    try {
      const res = await fetch(`/api/clinicas/${clinicId}/profesionales/${profId}/disponibilidad`);
      if (res.ok) {
        const rows: DisponibilidadRow[] = await res.json();
        if (rows.length > 0) {
          const filled = defaultDisponibilidad().map(def => {
            const found = rows.find(r => r.dia_semana === def.dia_semana);
            return found ? { ...def, ...found } : def;
          });
          setDisponibilidad(filled);
        } else {
          setDisponibilidad(defaultDisponibilidad());
        }
      }
    } finally {
      setLoadingDisp(false);
    }
  }

  async function saveDisponibilidad(profId: string) {
    await fetch(`/api/clinicas/${clinicId}/profesionales/${profId}/disponibilidad`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ horarios: disponibilidad }),
    });
  }

  // ── Servicios state ──────────────────────────────────────────────────────
  const [serviciosList, setServiciosList]   = useState<Servicio[]>(servicios);
  const [svcNombre, setSvcNombre]           = useState("");
  const [svcDuracion, setSvcDuracion]       = useState(30);
  const [svcDescripcion, setSvcDescripcion] = useState("");
  const [editingSvcId, setEditingSvcId]     = useState<string | null>(null);

  // ── Shared state ─────────────────────────────────────────────────────────
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError]     = useState("");

  // ── Save cita ────────────────────────────────────────────────────────────
  const saveCita = async () => {
    if (!fechaInicio) { setError("Selecciona fecha y hora"); return; }
    setSaving(true); setError("");
    const body = {
      paciente_nombre:    pacNombre || null,
      paciente_telefono:  pacTelefono || null,
      tipo_servicio:      servicio || null,
      profesional:        prof || null,
      estado,
      duracion_min:       duracion,
      fecha_inicio:       new Date(fechaInicio).toISOString(),
      fecha_fin:          computeFechaFin(fechaInicio, duracion),
      notas_internas:     notas || null,
      origen,
      sala_id:            salaId || null,
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Error al guardar");
      }
      onSaved(); onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally { setSaving(false); }
  };

  // ── Delete cita ──────────────────────────────────────────────────────────
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

  // ── Quick status change ──────────────────────────────────────────────────
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

  // ── Save bloqueo ─────────────────────────────────────────────────────────
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

  // ── Profesionales ────────────────────────────────────────────────────────
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
      // Save default availability for new professional
      await saveDisponibilidadForProf(nuevo.id);
      setProfsList(p => [...p, nuevo]);
      setProfNombre(""); setProfColor("#2563eb"); setProfEspecialidad("");
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setSaving(false); }
  };

  async function saveDisponibilidadForProf(profId: string) {
    await fetch(`/api/clinicas/${clinicId}/profesionales/${profId}/disponibilidad`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ horarios: disponibilidad.filter(d => d.activo) }),
    });
  }

  const removeProfesional = async (profId: string) => {
    const res = await fetch(`/api/clinicas/${clinicId}/profesionales/${profId}`, { method: "DELETE" });
    if (res.ok) { setProfsList(p => p.filter(x => x.id !== profId)); onSaved(); }
  };

  const openEditProf = async (prof: Profesional) => {
    setEditingProfId(prof.id);
    await loadDisponibilidad(prof.id);
  };

  const saveEditProf = async (profId: string) => {
    setSaving(true);
    try {
      await saveDisponibilidad(profId);
      onSaved();
      setEditingProfId(null);
    } finally { setSaving(false); }
  };

  // ── Servicios ─────────────────────────────────────────────────────────────
  const addServicio = async () => {
    if (!svcNombre) { setError("Introduce el nombre del servicio"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/clinicas/${clinicId}/servicios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: svcNombre, duracion_min: svcDuracion, descripcion: svcDescripcion || null }),
      });
      if (!res.ok) throw new Error("Error al crear servicio");
      const nuevo = await res.json();
      setServiciosList(s => [...s, nuevo]);
      setSvcNombre(""); setSvcDuracion(30); setSvcDescripcion("");
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setSaving(false); }
  };

  const removeServicio = async (svcId: string) => {
    const res = await fetch(`/api/clinicas/${clinicId}/servicios/${svcId}`, { method: "DELETE" });
    if (res.ok) { setServiciosList(s => s.filter(x => x.id !== svcId)); onSaved(); }
  };

  // ── Estado info ──────────────────────────────────────────────────────────
  const estadoInfo = ESTADOS.find(e => e.value === estado) || ESTADOS[0];
  const origenLabel = ORIGENES.find(o => o.value === (initialCita?.origen || "manual"))?.label || "Manual";

  const title = isServicios  ? "Gestionar servicios"
    : isProfs      ? "Gestionar profesionales"
    : isBloquear   ? "Bloquear agenda"
    : isVer && !editing ? "Detalle de cita"
    : isVer && editing  ? "Editar cita"
    : "Nueva cita";

  const wide = isProfs || isServicios;

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
          width: "100%", maxWidth: wide ? 580 : 480,
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
          maxHeight: "92vh", overflow: "auto",
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111827" }}>{title}</h2>
          <button onClick={onClose} style={iconBtnSt}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M14 2L2 14" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {error && <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16 }}>{error}</div>}

          {/* ── VIEW MODE ── */}
          {isVer && !editing && (
            <>
              {/* Origin badge */}
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 11.5, background: "#f3f4f6", color: "#6b7280", padding: "3px 10px", borderRadius: 20, fontWeight: 500 }}>
                  {origenLabel}
                </span>
              </div>

              {/* Status pills */}
              <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
                {ESTADOS.map(e => (
                  <button key={e.value} onClick={() => changeStatus(e.value)} style={{
                    padding: "5px 12px", borderRadius: 20, border: `2px solid ${estado === e.value ? e.color : "transparent"}`,
                    background: e.bg, color: e.color, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    opacity: saving ? 0.6 : 1,
                  }}>
                    {e.label}
                  </button>
                ))}
              </div>

              {/* Info rows */}
              {(initialCita?.paciente_nombre || initialCita?.pacientes?.nombre) && (
                <InfoRow icon="👤" label="Paciente" value={initialCita!.paciente_nombre || initialCita!.pacientes?.nombre || ""} />
              )}
              {(initialCita?.paciente_telefono || initialCita?.pacientes?.telefono) && (
                <InfoRow icon="📞" label="Teléfono" value={initialCita!.paciente_telefono || initialCita!.pacientes?.telefono || ""} />
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
                  {servicios.length > 0 ? (
                    <select
                      value={servicio}
                      onChange={e => handleServicioChange(e.target.value)}
                      style={{ ...inputSt, cursor: "pointer" }}
                    >
                      <option value="">Seleccionar servicio...</option>
                      {servicios.map(s => (
                        <option key={s.id} value={s.nombre}>{s.nombre} ({s.duracion_min} min)</option>
                      ))}
                      <option value="__otro__">Otro (escribir)</option>
                    </select>
                  ) : (
                    <input value={servicio} onChange={e => setServicio(e.target.value)} placeholder="Ej: Limpieza dental" style={inputSt} />
                  )}
                </Field>
                {/* Si eligió "Otro" del dropdown, mostrar campo libre */}
                {servicios.length > 0 && servicio === "__otro__" && (
                  <Field label="Nombre del servicio">
                    <input autoFocus onChange={e => setServicio(e.target.value)} placeholder="Describir servicio" style={inputSt} />
                  </Field>
                )}
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Estado">
                  <select value={estado} onChange={e => setEstado(e.target.value)} style={{ ...inputSt, cursor: "pointer" }}>
                    {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </Field>
                <Field label="Origen">
                  <select value={origen} onChange={e => setOrigen(e.target.value)} style={{ ...inputSt, cursor: "pointer" }}>
                    {ORIGENES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
              </div>

              {salas.length > 0 && (
                <Field label="Sala / Espacio">
                  <select value={salaId} onChange={e => setSalaId(e.target.value)} style={{ ...inputSt, cursor: "pointer" }}>
                    <option value="">Sin sala asignada</option>
                    {salas.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.tipo})</option>)}
                  </select>
                </Field>
              )}

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
              {profsList.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "#374151" }}>Profesionales activos</p>
                  {profsList.map(p => (
                    <div key={p.id}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 12px", background: "#f9fafb", borderRadius: 8, marginBottom: 4,
                      }}>
                        <span style={{ width: 12, height: 12, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#111827" }}>{p.nombre}</div>
                          {p.especialidad && <div style={{ fontSize: 12, color: "#9ca3af" }}>{p.especialidad}</div>}
                        </div>
                        <button
                          onClick={() => editingProfId === p.id ? setEditingProfId(null) : openEditProf(p)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 12, fontWeight: 500 }}
                        >
                          {editingProfId === p.id ? "Cerrar" : "Horario"}
                        </button>
                        <button onClick={() => removeProfesional(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18, lineHeight: 1 }}>×</button>
                      </div>

                      {/* Disponibilidad inline */}
                      {editingProfId === p.id && (
                        <div style={{ background: "#f9fafb", borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                          <p style={{ margin: "0 0 10px", fontSize: 12.5, fontWeight: 600, color: "#374151" }}>Horario semanal</p>
                          {loadingDisp ? (
                            <div style={{ fontSize: 12, color: "#9ca3af" }}>Cargando...</div>
                          ) : (
                            disponibilidad.map((d, idx) => (
                              <div key={d.dia_semana} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 32px", gap: 6, alignItems: "center", marginBottom: 6 }}>
                                <span style={{ fontSize: 12.5, color: d.activo ? "#111827" : "#9ca3af", fontWeight: 500 }}>{DIAS_SEMANA[d.dia_semana]}</span>
                                <input
                                  type="time" value={d.hora_inicio} disabled={!d.activo}
                                  onChange={e => setDisponibilidad(ds => ds.map((x, i) => i === idx ? { ...x, hora_inicio: e.target.value } : x))}
                                  style={{ ...inputSt, padding: "6px 8px", fontSize: 12, opacity: d.activo ? 1 : 0.4 }}
                                />
                                <input
                                  type="time" value={d.hora_fin} disabled={!d.activo}
                                  onChange={e => setDisponibilidad(ds => ds.map((x, i) => i === idx ? { ...x, hora_fin: e.target.value } : x))}
                                  style={{ ...inputSt, padding: "6px 8px", fontSize: 12, opacity: d.activo ? 1 : 0.4 }}
                                />
                                <input
                                  type="checkbox" checked={d.activo}
                                  onChange={e => setDisponibilidad(ds => ds.map((x, i) => i === idx ? { ...x, activo: e.target.checked } : x))}
                                  style={{ width: 16, height: 16, cursor: "pointer" }}
                                />
                              </div>
                            ))
                          )}
                          <button onClick={() => saveEditProf(p.id)} disabled={saving} style={{ ...btnPrimary, marginTop: 8, fontSize: 13, padding: "8px 14px" }}>
                            {saving ? "Guardando…" : "Guardar horario"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

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
                            width: 22, height: 22, borderRadius: "50%", background: c,
                            border: profColor === c ? "2px solid #111827" : "2px solid transparent", cursor: "pointer",
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

          {/* ── SERVICIOS ── */}
          {isServicios && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {serviciosList.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "#374151" }}>Servicios activos</p>
                  {serviciosList.map(s => (
                    <div key={s.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", background: "#f9fafb", borderRadius: 8, marginBottom: 6,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: "#111827" }}>{s.nombre}</div>
                        <div style={{ fontSize: 12, color: "#9ca3af" }}>{s.duracion_min} min{s.descripcion ? ` · ${s.descripcion}` : ""}</div>
                      </div>
                      <button onClick={() => removeServicio(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18, lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "#374151" }}>Añadir servicio</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label="Nombre *">
                      <input value={svcNombre} onChange={e => setSvcNombre(e.target.value)} placeholder="Ej: Limpieza dental" style={inputSt} />
                    </Field>
                    <Field label="Duración (min)">
                      <select value={svcDuracion} onChange={e => setSvcDuracion(Number(e.target.value))} style={{ ...inputSt, cursor: "pointer" }}>
                        {DURACIONES.map(d => <option key={d} value={d}>{d} min</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Descripción (opcional)">
                    <input value={svcDescripcion} onChange={e => setSvcDescripcion(e.target.value)} placeholder="Descripción breve" style={inputSt} />
                  </Field>
                  <button onClick={addServicio} disabled={saving} style={btnPrimary}>
                    {saving ? "Guardando…" : "+ Añadir servicio"}
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
