"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import ModalCita, { type Cita, type Profesional, type Servicio, type Sala, type ModalMode } from "./ModalCita";

type BloqueAgenda = {
  id: string;
  profesional?: string;
  titulo: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: string;
};

type Vista = "dia" | "semana" | "mes";

// ── Constants ────────────────────────────────────────────────────────────────
const HORA_INICIO = 8;
const HORA_FIN = 21;
const HORA_HEIGHT = 64; // px per hour
const HORAS = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => HORA_INICIO + i);
const DIAS_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const ESTADO_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  confirmada:   { bg: "#dcfce7", color: "#166534", border: "#86efac" },
  pendiente:    { bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
  reprogramada: { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
  completada:   { bg: "#e0e7ff", color: "#3730a3", border: "#a5b4fc" },
  cancelada:    { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  no_asistio:        { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
  requiere_revision: { bg: "#fef3c7", color: "#92400e", border: "#fcd34d" },
  sync_failed:       { bg: "#fce7f3", color: "#9d174d", border: "#f9a8d4" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function fmtFechaCorta(d: Date) {
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function getCitaTop(fecha: string): number {
  const d = new Date(fecha);
  return (d.getHours() - HORA_INICIO + d.getMinutes() / 60) * HORA_HEIGHT;
}

function getCitaHeight(inicio: string, fin?: string, duracion?: number): number {
  if (fin) {
    const ms = new Date(fin).getTime() - new Date(inicio).getTime();
    return Math.max(28, (ms / 3_600_000) * HORA_HEIGHT - 4);
  }
  const mins = duracion || 60;
  return Math.max(28, (mins / 60) * HORA_HEIGHT - 4);
}

function citaColor(cita: Cita, profesionales: Profesional[]): string {
  if (cita.color) return cita.color;
  if (cita.profesional) {
    const p = profesionales.find(p => p.nombre === cita.profesional);
    if (p) return p.color;
  }
  return "#2563eb";
}

// Overlap layout: returns left% and width% for each cita in a day
function layoutDia(citas: Cita[]): Array<Cita & { _left: number; _width: number }> {
  if (!citas.length) return [];
  const sorted = [...citas].sort((a, b) =>
    new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
  );
  // Assign to columns greedily
  const cols: number[][] = [];
  const mapped = sorted.map((c, idx) => {
    const startMs = new Date(c.fecha_inicio).getTime();
    let col = cols.findIndex(column => {
      const lastIdx = column[column.length - 1];
      const lastEnd = sorted[lastIdx].fecha_fin
        ? new Date(sorted[lastIdx].fecha_fin!).getTime()
        : new Date(sorted[lastIdx].fecha_inicio).getTime() + (sorted[lastIdx].duracion_min || 60) * 60_000;
      return lastEnd <= startMs;
    });
    if (col === -1) { col = cols.length; cols.push([]); }
    cols[col].push(idx);
    return { ...c, _col: col };
  });
  const n = cols.length;
  return mapped.map(c => ({ ...c, _left: (c._col / n) * 100, _width: (1 / n) * 100 }));
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CalendarioCliente({ clinicId, tieneCalendario, googleAuthUrl }: {
  clinicId: string;
  tieneCalendario: boolean;
  googleAuthUrl: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [vista, setVista] = useState<Vista>("semana");
  const [anchor, setAnchor] = useState<Date>(new Date(today));
  const [citas, setCitas] = useState<Cita[]>([]);
  const [bloques, setBloques] = useState<BloqueAgenda[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [filtroProfesional, setFiltroProfesional] = useState<string>("todos");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");

  // ── Date range ────────────────────────────────────────────
  const getRango = useCallback((v: Vista, a: Date): { desde: Date; hasta: Date } => {
    if (v === "dia") {
      const desde = new Date(a); desde.setHours(0, 0, 0, 0);
      const hasta = new Date(a); hasta.setHours(23, 59, 59, 999);
      return { desde, hasta };
    }
    if (v === "semana") {
      const desde = getMonday(a);
      const hasta = addDays(desde, 6); hasta.setHours(23, 59, 59, 999);
      return { desde, hasta };
    }
    const desde = new Date(a.getFullYear(), a.getMonth(), 1);
    const hasta = new Date(a.getFullYear(), a.getMonth() + 1, 0, 23, 59, 59);
    return { desde, hasta };
  }, []);

  // ── Fetch ─────────────────────────────────────────────────
  const fetchData = useCallback(async (v: Vista, a: Date) => {
    setLoading(true);
    const { desde, hasta } = getRango(v, a);
    const fi = encodeURIComponent(desde.toISOString());
    const ff = encodeURIComponent(hasta.toISOString());
    try {
      const [citasRes, bloquesRes] = await Promise.all([
        fetch(`/api/clinicas/${clinicId}/citas?fecha_inicio=${fi}&fecha_fin=${ff}`),
        fetch(`/api/clinicas/${clinicId}/bloques?fecha_inicio=${fi}&fecha_fin=${ff}`),
      ]);
      if (citasRes.ok) setCitas(await citasRes.json());
      if (bloquesRes.ok) setBloques(await bloquesRes.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [clinicId, getRango]);

  const refreshStaticData = useCallback(() => {
    Promise.all([
      fetch(`/api/clinicas/${clinicId}/profesionales`).then(r => r.ok ? r.json() : []),
      fetch(`/api/clinicas/${clinicId}/servicios`).then(r => r.ok ? r.json() : []),
      fetch(`/api/clinicas/${clinicId}/salas`).then(r => r.ok ? r.json() : []),
    ]).then(([profs, svcs, sls]) => {
      setProfesionales(profs);
      setServicios(svcs);
      setSalas(sls);
    }).catch(() => {});
  }, [clinicId]);

  useEffect(() => { refreshStaticData(); }, [refreshStaticData]);

  useEffect(() => { fetchData(vista, anchor); }, [vista, anchor, fetchData]);

  // ── Navigation ────────────────────────────────────────────
  const navAnterior = () => {
    const d = new Date(anchor);
    if (vista === "dia") d.setDate(d.getDate() - 1);
    else if (vista === "semana") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setAnchor(d);
  };
  const navSiguiente = () => {
    const d = new Date(anchor);
    if (vista === "dia") d.setDate(d.getDate() + 1);
    else if (vista === "semana") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setAnchor(d);
  };

  const titulo = (() => {
    if (vista === "dia") return anchor.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (vista === "semana") {
      const { desde, hasta } = getRango("semana", anchor);
      return `${fmtFechaCorta(desde)} — ${fmtFechaCorta(hasta)}, ${hasta.getFullYear()}`;
    }
    return `${MESES[anchor.getMonth()]} ${anchor.getFullYear()}`;
  })();

  const citasFiltradas = citas.filter(c => {
    if (filtroProfesional !== "todos" && c.profesional !== filtroProfesional) return false;
    if (filtroEstado !== "todos" && c.estado !== filtroEstado) return false;
    return true;
  });
  const citasDelDia = (d: Date) => citasFiltradas.filter(c => isSameDay(new Date(c.fecha_inicio), d));
  const bloquesDelDia = (d: Date) => bloques.filter(b => isSameDay(new Date(b.fecha_inicio), d));

  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(getMonday(anchor), i));
  const diasDia = vista === "dia"
    ? (profesionales.length > 0 ? profesionales.map(p => ({ label: p.nombre, color: p.color, filtro: (c: Cita) => !c.profesional || c.profesional === p.nombre })) : [{ label: "Citas del día", color: "#2563eb", filtro: () => true }])
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 110px)", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>

      {/* GCal banner */}
      {!tieneCalendario && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 16px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#92400e" }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="2.5" width="13" height="11.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 6h13M5 1v3M10 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Conecta Google Calendar para sincronizar citas en ambas direcciones.
          </div>
          <a href={googleAuthUrl} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "white", border: "1px solid #d1d5db", borderRadius: 7, padding: "6px 14px", fontSize: 12.5, fontWeight: 600, color: "#374151", textDecoration: "none" }}>
            <GoogleIcon /> Conectar
          </a>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexShrink: 0, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={navAnterior} style={navBtn}>‹</button>
          <button onClick={navSiguiente} style={navBtn}>›</button>
          <button onClick={() => setAnchor(new Date(today))} style={todayBtn}>Hoy</button>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginLeft: 4 }}>{titulo}</span>
          {loading && <span style={{ fontSize: 12, color: "#9ca3af" }}>·</span>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Filtro por profesional */}
          {profesionales.length > 0 && (
            <select
              value={filtroProfesional}
              onChange={e => setFiltroProfesional(e.target.value)}
              style={{ fontSize: 12.5, border: "1px solid #e5e7eb", borderRadius: 7, padding: "5px 10px", color: "#374151", background: "white", cursor: "pointer" }}
            >
              <option value="todos">Todos los profesionales</option>
              {profesionales.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
            </select>
          )}

          {/* Filtro por estado */}
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            style={{ fontSize: 12.5, border: "1px solid #e5e7eb", borderRadius: 7, padding: "5px 10px", color: "#374151", background: "white", cursor: "pointer" }}
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="confirmada">Confirmada</option>
            <option value="reprogramada">Reprogramada</option>
            <option value="completada">Completada</option>
            <option value="cancelada">Cancelada</option>
            <option value="no_asistio">No asistió</option>
          </select>

          {/* Legend pills */}
          {profesionales.map(p => (
            <span
              key={p.id}
              onClick={() => setFiltroProfesional(prev => prev === p.nombre ? "todos" : p.nombre)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12,
                color: filtroProfesional === p.nombre ? "white" : "#374151",
                background: filtroProfesional === p.nombre ? p.color : "#f9fafb",
                border: `1px solid ${p.color}`,
                borderRadius: 20, padding: "3px 10px 3px 7px", cursor: "pointer",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: filtroProfesional === p.nombre ? "white" : p.color, display: "inline-block" }} />
              {p.nombre}
            </span>
          ))}

          <button onClick={() => setModal({ type: "servicios" })} style={toolBtn} title="Gestionar servicios">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3h10M2 7h6M2 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Servicios
          </button>

          <button onClick={() => setModal({ type: "profesionales" })} style={toolBtn} title="Gestionar profesionales">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1 12c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M10 7v4M8 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </button>

          <button onClick={() => setModal({ type: "bloquear" })} style={toolBtn}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M5 5h4M5 9h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Bloquear
          </button>

          <button onClick={() => setModal({ type: "nueva", slotDate: anchor, slotHour: 9 })} style={btnNuevaCita}>
            + Nueva cita
          </button>

          {/* GCal badge */}
          {tieneCalendario ? (
            <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20, padding: "4px 10px 4px 8px", textDecoration: "none" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#166534" }}>Google Calendar</span>
            </a>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 20, padding: "4px 10px 4px 8px", fontSize: 11.5, color: "#9ca3af" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#d1d5db", display: "inline-block" }} />
              Atiende360
            </span>
          )}

          <a
            href="/panel/agenda"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "white", border: "1px solid #e5e7eb", borderRadius: 7, padding: "5px 12px", fontSize: 12.5, fontWeight: 500, color: "#374151", textDecoration: "none" }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1.5v2M6.5 9.5v2M1.5 6.5h2M9.5 6.5h2M3.4 3.4l1.4 1.4M8.2 8.2l1.4 1.4M3.4 9.6l1.4-1.4M8.2 4.8l1.4-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Disponibilidad
          </a>

          {/* View switcher */}
          <div style={{ display: "flex", gap: 2, background: "#f3f4f6", borderRadius: 8, padding: 3 }}>
            {(["dia", "semana", "mes"] as Vista[]).map(v => (
              <button key={v} onClick={() => setVista(v)} style={{
                padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 12.5, fontWeight: 500,
                background: vista === v ? "white" : "transparent",
                color: vista === v ? "#111827" : "#6b7280",
                boxShadow: vista === v ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}>
                {v === "dia" ? "Día" : v === "semana" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar body */}
      <div style={{ flex: 1, overflow: "hidden", background: "white", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>

        {/* ── WEEK VIEW ── */}
        {vista === "semana" && (
          <VistaHoras
            dias={diasSemana}
            today={today}
            citasDelDia={citasDelDia}
            bloquesDelDia={bloquesDelDia}
            profesionales={profesionales}
            onSelectCita={c => setModal({ type: "ver", cita: c })}
            onClickSlot={(date, hour) => setModal({ type: "nueva", slotDate: date, slotHour: hour })}
          />
        )}

        {/* ── DAY VIEW (multi-professional columns) ── */}
        {vista === "dia" && (
          <VistaDia
            date={anchor}
            today={today}
            profesionales={profesionales}
            citas={citasDelDia(anchor)}
            bloques={bloquesDelDia(anchor)}
            onSelectCita={c => setModal({ type: "ver", cita: c })}
            onClickSlot={(hour, prof) => setModal({ type: "nueva", slotDate: anchor, slotHour: hour, slotProfesional: prof })}
          />
        )}

        {/* ── MONTH VIEW ── */}
        {vista === "mes" && (
          <VistaMes
            year={anchor.getFullYear()}
            month={anchor.getMonth()}
            today={today}
            citasDelDia={citasDelDia}
            profesionales={profesionales}
            onSelectDia={d => { setAnchor(d); setVista("dia"); }}
            onSelectCita={c => setModal({ type: "ver", cita: c })}
          />
        )}
      </div>

      {/* Modal */}
      {modal && (
        <ModalCita
          mode={modal}
          clinicId={clinicId}
          profesionales={profesionales}
          servicios={servicios}
          salas={salas}
          onClose={() => setModal(null)}
          onSaved={() => {
            fetchData(vista, anchor);
            refreshStaticData();
          }}
        />
      )}
    </div>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────
function VistaHoras({ dias, today, citasDelDia, bloquesDelDia, profesionales, onSelectCita, onClickSlot }: {
  dias: Date[];
  today: Date;
  citasDelDia: (d: Date) => Cita[];
  bloquesDelDia: (d: Date) => BloqueAgenda[];
  profesionales: Profesional[];
  onSelectCita: (c: Cita) => void;
  onClickSlot: (date: Date, hour: number) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const totalHeight = (HORA_FIN - HORA_INICIO) * HORA_HEIGHT;

  // Scroll to 8:00
  useEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = 0;
  }, []);

  // Current time line
  const now = new Date();
  const nowTop = (now.getHours() - HORA_INICIO + now.getMinutes() / 60) * HORA_HEIGHT;
  const showNow = now.getHours() >= HORA_INICIO && now.getHours() < HORA_FIN;

  const LABEL_W = 52;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: `${LABEL_W}px repeat(${dias.length}, 1fr)`, borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
        <div style={{ borderRight: "1px solid #f3f4f6" }} />
        {dias.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <div key={i} style={{
              padding: "10px 4px", textAlign: "center",
              borderRight: i < dias.length - 1 ? "1px solid #f3f4f6" : "none",
              background: isToday ? "#eff6ff" : "white",
            }}>
              <div style={{ fontSize: 11, color: isToday ? "#2563eb" : "#9ca3af", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][d.getDay()]}
              </div>
              <div style={{
                fontSize: 18, fontWeight: 700,
                color: isToday ? "white" : "#111827",
                background: isToday ? "#2563eb" : "transparent",
                width: 32, height: 32, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "2px auto 0",
              }}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={gridRef} style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `${LABEL_W}px repeat(${dias.length}, 1fr)`, height: totalHeight, position: "relative" }}>
          {/* Hour labels */}
          <div style={{ borderRight: "1px solid #f3f4f6" }}>
            {HORAS.map(h => (
              <div key={h} style={{ height: HORA_HEIGHT, borderBottom: "1px solid #f9fafb", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingRight: 8, paddingTop: 4 }}>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{h}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {dias.map((d, di) => {
            const isToday = isSameDay(d, today);
            const citasDia = layoutDia(citasDelDia(d));
            const bloquesDia = bloquesDelDia(d);
            return (
              <div
                key={di}
                onClick={e => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const hour = Math.floor(y / HORA_HEIGHT) + HORA_INICIO;
                  onClickSlot(d, Math.min(hour, HORA_FIN - 1));
                }}
                style={{
                  position: "relative", borderRight: di < dias.length - 1 ? "1px solid #f3f4f6" : "none",
                  background: isToday ? "#fafcff" : "white", cursor: "cell",
                }}
              >
                {/* Hour grid lines */}
                {HORAS.map(h => (
                  <div key={h} style={{ position: "absolute", top: (h - HORA_INICIO) * HORA_HEIGHT, left: 0, right: 0, height: HORA_HEIGHT, borderBottom: "1px solid #f9fafb" }}>
                    <div style={{ position: "absolute", top: HORA_HEIGHT / 2, left: 0, right: 0, borderBottom: "1px dashed #f3f4f6" }} />
                  </div>
                ))}

                {/* Bloques */}
                {bloquesDia.map(b => {
                  const top = getCitaTop(b.fecha_inicio);
                  const height = getCitaHeight(b.fecha_inicio, b.fecha_fin);
                  return (
                    <div key={b.id} title={b.titulo} style={{
                      position: "absolute", top, left: 2, right: 2, height,
                      background: "#f3f4f6", border: "1px solid #d1d5db",
                      borderRadius: 4, padding: "2px 5px", fontSize: 11, color: "#6b7280",
                      overflow: "hidden", zIndex: 1,
                    }}>
                      🚫 {b.titulo}
                    </div>
                  );
                })}

                {/* Citas */}
                {citasDia.map(c => {
                  const top = getCitaTop(c.fecha_inicio);
                  const height = getCitaHeight(c.fecha_inicio, c.fecha_fin, c.duracion_min);
                  const color = citaColor(c, profesionales);
                  const est = ESTADO_STYLE[c.estado] || ESTADO_STYLE.confirmada;
                  const nombre = c.paciente_nombre || c.pacientes?.nombre || "Sin nombre";
                  return (
                    <div
                      key={c.id}
                      onClick={e => { e.stopPropagation(); onSelectCita(c); }}
                      style={{
                        position: "absolute",
                        top, height,
                        left: `calc(${c._left}% + 2px)`,
                        width: `calc(${c._width}% - 4px)`,
                        background: est.bg,
                        borderLeft: `3px solid ${color}`,
                        borderRadius: 5, padding: "3px 6px",
                        overflow: "hidden", cursor: "pointer", zIndex: 2,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                        transition: "opacity 0.1s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                      onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                    >
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: est.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nombre}</div>
                      {height > 36 && c.tipo_servicio && (
                        <div style={{ fontSize: 10.5, color: est.color, opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.tipo_servicio}</div>
                      )}
                    </div>
                  );
                })}

                {/* Current time line */}
                {isToday && showNow && (
                  <div style={{ position: "absolute", top: nowTop, left: 0, right: 0, height: 2, background: "#ef4444", zIndex: 5 }}>
                    <div style={{ position: "absolute", left: 0, top: -4, width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Day View (multi-professional columns) ─────────────────────────────────────
function VistaDia({ date, today, profesionales, citas, bloques, onSelectCita, onClickSlot }: {
  date: Date;
  today: Date;
  profesionales: Profesional[];
  citas: Cita[];
  bloques: BloqueAgenda[];
  onSelectCita: (c: Cita) => void;
  onClickSlot: (hour: number, profesional?: string) => void;
}) {
  const totalHeight = (HORA_FIN - HORA_INICIO) * HORA_HEIGHT;
  const LABEL_W = 52;
  const isToday = isSameDay(date, today);
  const now = new Date();
  const nowTop = (now.getHours() - HORA_INICIO + now.getMinutes() / 60) * HORA_HEIGHT;
  const showNow = isToday && now.getHours() >= HORA_INICIO && now.getHours() < HORA_FIN;

  // Columns: one per professional, or single if no professionals
  const cols = profesionales.length > 0
    ? profesionales.map(p => ({ label: p.nombre, color: p.color, id: p.id, citas: layoutDia(citas.filter(c => c.profesional === p.nombre)) }))
    : [{ label: "Citas del día", color: "#2563eb", id: "_all", citas: layoutDia(citas) }];

  const sinAsignar = profesionales.length > 0 ? layoutDia(citas.filter(c => !c.profesional)) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: `${LABEL_W}px repeat(${cols.length + (sinAsignar.length > 0 ? 1 : 0)}, 1fr)`, borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
        <div style={{ borderRight: "1px solid #f3f4f6" }} />
        {cols.map((col, i) => (
          <div key={col.id} style={{ padding: "10px 8px", textAlign: "center", borderRight: "1px solid #f3f4f6", background: "#fafafa" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: col.color }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{col.label}</span>
            </div>
          </div>
        ))}
        {sinAsignar.length > 0 && (
          <div style={{ padding: "10px 8px", textAlign: "center", background: "#fafafa" }}>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>Sin asignar</span>
          </div>
        )}
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `${LABEL_W}px repeat(${cols.length + (sinAsignar.length > 0 ? 1 : 0)}, 1fr)`, height: totalHeight }}>
          {/* Hour labels */}
          <div style={{ borderRight: "1px solid #f3f4f6" }}>
            {HORAS.map(h => (
              <div key={h} style={{ height: HORA_HEIGHT, borderBottom: "1px solid #f9fafb", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingRight: 8, paddingTop: 4 }}>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{h}:00</span>
              </div>
            ))}
          </div>

          {/* Professional columns */}
          {[...cols, ...(sinAsignar.length > 0 ? [{ label: "Sin asignar", color: "#9ca3af", id: "_sin", citas: sinAsignar }] : [])].map((col, ci) => (
            <div
              key={col.id}
              onClick={e => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const y = e.clientY - rect.top;
                const hour = Math.floor(y / HORA_HEIGHT) + HORA_INICIO;
                onClickSlot(Math.min(hour, HORA_FIN - 1), col.id !== "_all" && col.id !== "_sin" ? col.label : undefined);
              }}
              style={{
                position: "relative",
                borderRight: "1px solid #f3f4f6",
                cursor: "cell", background: "white",
              }}
            >
              {HORAS.map(h => (
                <div key={h} style={{ position: "absolute", top: (h - HORA_INICIO) * HORA_HEIGHT, left: 0, right: 0, height: HORA_HEIGHT, borderBottom: "1px solid #f9fafb" }}>
                  <div style={{ position: "absolute", top: HORA_HEIGHT / 2, left: 0, right: 0, borderBottom: "1px dashed #f3f4f6" }} />
                </div>
              ))}

              {/* Bloques */}
              {bloques.filter(b => !b.profesional || b.profesional === col.label).map(b => (
                <div key={b.id} style={{
                  position: "absolute", top: getCitaTop(b.fecha_inicio), left: 2, right: 2,
                  height: getCitaHeight(b.fecha_inicio, b.fecha_fin),
                  background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 4,
                  padding: "2px 5px", fontSize: 11, color: "#6b7280", overflow: "hidden", zIndex: 1,
                }}>
                  🚫 {b.titulo}
                </div>
              ))}

              {/* Citas */}
              {col.citas.map(c => {
                const top = getCitaTop(c.fecha_inicio);
                const height = getCitaHeight(c.fecha_inicio, c.fecha_fin, c.duracion_min);
                const est = ESTADO_STYLE[c.estado] || ESTADO_STYLE.confirmada;
                const nombre = c.paciente_nombre || c.pacientes?.nombre || "Sin nombre";
                return (
                  <div
                    key={c.id}
                    onClick={e => { e.stopPropagation(); onSelectCita(c); }}
                    style={{
                      position: "absolute", top, height,
                      left: `calc(${c._left}% + 2px)`, width: `calc(${c._width}% - 4px)`,
                      background: est.bg, borderLeft: `3px solid ${col.color}`,
                      borderRadius: 5, padding: "3px 7px", overflow: "hidden",
                      cursor: "pointer", zIndex: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: est.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nombre}</div>
                    {height > 36 && c.tipo_servicio && (
                      <div style={{ fontSize: 11, color: est.color, opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.tipo_servicio}</div>
                    )}
                    {height > 54 && (
                      <div style={{ fontSize: 10.5, color: est.color, opacity: 0.6 }}>
                        {new Date(c.fecha_inicio).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                        {c.duracion_min ? ` · ${c.duracion_min}min` : ""}
                      </div>
                    )}
                  </div>
                );
              })}

              {showNow && (
                <div style={{ position: "absolute", top: nowTop, left: 0, right: 0, height: 2, background: "#ef4444", zIndex: 5, pointerEvents: "none" }}>
                  <div style={{ position: "absolute", left: 0, top: -4, width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Month View ────────────────────────────────────────────────────────────────
function VistaMes({ year, month, today, citasDelDia, profesionales, onSelectDia, onSelectCita }: {
  year: number;
  month: number;
  today: Date;
  citasDelDia: (d: Date) => Cita[];
  profesionales: Profesional[];
  onSelectDia: (d: Date) => void;
  onSelectCita: (c: Cita) => void;
}) {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const day = i - startOffset + 1;
    return (day >= 1 && day <= daysInMonth) ? new Date(year, month, day) : null;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #f3f4f6" }}>
        {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d => (
          <div key={d} style={{ padding: "8px 0", textAlign: "center", fontSize: 11.5, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{d}</div>
        ))}
      </div>
      {/* Grid */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "1fr", overflow: "auto" }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} style={{ borderRight: "1px solid #f9fafb", borderBottom: "1px solid #f9fafb", background: "#fafafa" }} />;
          const isToday = isSameDay(d, today);
          const citasDia = citasDelDia(d);
          return (
            <div
              key={i}
              onClick={() => onSelectDia(d)}
              style={{
                padding: "6px 8px", borderRight: "1px solid #f3f4f6", borderBottom: "1px solid #f3f4f6",
                cursor: "pointer", minHeight: 80,
                background: isToday ? "#eff6ff" : "white",
              }}
              onMouseEnter={e => { if (!isToday) (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isToday ? "#eff6ff" : "white"; }}
            >
              <div style={{
                fontSize: 13, fontWeight: isToday ? 700 : 500,
                color: isToday ? "white" : "#111827",
                background: isToday ? "#2563eb" : "transparent",
                width: 24, height: 24, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 4,
              }}>
                {d.getDate()}
              </div>
              {citasDia.slice(0, 3).map(c => {
                const color = citaColor(c, profesionales);
                const est = ESTADO_STYLE[c.estado] || ESTADO_STYLE.confirmada;
                return (
                  <div
                    key={c.id}
                    onClick={e => { e.stopPropagation(); onSelectCita(c); }}
                    style={{
                      fontSize: 11, padding: "1px 5px", borderRadius: 3, marginBottom: 2,
                      background: est.bg, color: est.color,
                      borderLeft: `2px solid ${color}`,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      cursor: "pointer",
                    }}
                  >
                    {new Date(c.fecha_inicio).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} {c.paciente_nombre || c.pacientes?.nombre || c.tipo_servicio || "Cita"}
                  </div>
                );
              })}
              {citasDia.length > 3 && (
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>+{citasDia.length - 3} más</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Icons & styles ────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

const navBtn: React.CSSProperties = {
  background: "white", border: "1px solid #e5e7eb", borderRadius: 7,
  width: 30, height: 30, cursor: "pointer", fontSize: 18, color: "#374151",
  display: "flex", alignItems: "center", justifyContent: "center",
};

const todayBtn: React.CSSProperties = {
  background: "white", border: "1px solid #e5e7eb", borderRadius: 7,
  padding: "5px 12px", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#374151",
};

const toolBtn: React.CSSProperties = {
  background: "white", border: "1px solid #e5e7eb", borderRadius: 7,
  padding: "5px 10px", cursor: "pointer", fontSize: 12.5, fontWeight: 500, color: "#374151",
  display: "inline-flex", alignItems: "center", gap: 5,
};

const btnNuevaCita: React.CSSProperties = {
  background: "linear-gradient(135deg, #2563eb, #4f46e5)",
  color: "white", border: "none", borderRadius: 8,
  padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600,
};
