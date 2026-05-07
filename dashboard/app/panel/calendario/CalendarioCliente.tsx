"use client";
import { useState, useEffect, useCallback } from "react";

type Cita = {
  id: string;
  tipo_servicio?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  estado: string;
  pacientes?: { nombre?: string; telefono?: string } | null;
};

type Vista = "dia" | "semana" | "mes";

const ESTADO_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  confirmada: { bg: "#dcfce7", color: "#166534", border: "#86efac" },
  cancelada: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  completada: { bg: "#e0e7ff", color: "#3730a3", border: "#a5b4fc" },
  pendiente: { bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
};

const DIAS_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const HORA_INICIO = 8;
const HORA_FIN = 21;
const HORA_HEIGHT = 64; // px por hora

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function fmtHora(d: Date) {
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function fmtFechaCorta(d: Date) {
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export default function CalendarioCliente({ clinicId, backendUrl, tieneCalendario, googleAuthUrl }: {
  clinicId: string;
  backendUrl: string;
  tieneCalendario: boolean;
  googleAuthUrl: string;
}) {
  if (!tieneCalendario) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 24 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: "#f0fdf4", border: "1px solid #bbf7d0",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="3" y="5" width="26" height="24" rx="3" stroke="#166534" strokeWidth="2" />
            <path d="M3 12H29M10 2V7M22 2V7" stroke="#166534" strokeWidth="2" strokeLinecap="round" />
            <rect x="7" y="16" width="5" height="5" rx="1" fill="#166534" fillOpacity="0.3" />
          </svg>
        </div>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#111827" }}>
            Conecta tu Google Calendar
          </h2>
          <p style={{ margin: "0 0 24px", fontSize: 14, color: "#6b7280", maxWidth: 380 }}>
            Para ver y gestionar citas desde el calendario, conecta tu cuenta de Google Calendar.
            La recepcionista IA podrá consultar disponibilidad y agendar citas automáticamente.
          </p>
          <a
            href={googleAuthUrl}
            style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "white",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "11px 20px",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
            }}
          >
            {/* Google logo */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
              <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
            </svg>
            Conectar con Google Calendar
          </a>
        </div>
      </div>
    );
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [vista, setVista] = useState<Vista>("semana");
  const [anchor, setAnchor] = useState<Date>(today); // base date para navegación
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null);

  // Calcular rango según vista
  const getRango = useCallback((v: Vista, a: Date): { desde: Date; hasta: Date } => {
    if (v === "dia") {
      const desde = new Date(a); desde.setHours(0, 0, 0, 0);
      const hasta = new Date(a); hasta.setHours(23, 59, 59, 999);
      return { desde, hasta };
    }
    if (v === "semana") {
      const desde = getMonday(a);
      const hasta = addDays(desde, 6);
      hasta.setHours(23, 59, 59, 999);
      return { desde, hasta };
    }
    // mes
    const desde = new Date(a.getFullYear(), a.getMonth(), 1);
    const hasta = new Date(a.getFullYear(), a.getMonth() + 1, 0, 23, 59, 59);
    return { desde, hasta };
  }, []);

  const fetchCitas = useCallback(async (v: Vista, a: Date) => {
    setLoading(true);
    const { desde, hasta } = getRango(v, a);
    const fi = desde.toISOString();
    const ff = hasta.toISOString();
    try {
      const res = await fetch(
        `${backendUrl}/admin/clinicas/${clinicId}/citas?fecha_inicio=${fi}&fecha_fin=${ff}`,
        { cache: "no-store" }
      );
      if (res.ok) setCitas(await res.json());
      else setCitas([]);
    } catch { setCitas([]); }
    finally { setLoading(false); }
  }, [clinicId, backendUrl, getRango]);

  useEffect(() => { fetchCitas(vista, anchor); }, [vista, anchor, fetchCitas]);

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
  const irHoy = () => setAnchor(new Date(today));

  // Título del periodo
  const titulo = (() => {
    if (vista === "dia") {
      return anchor.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    }
    if (vista === "semana") {
      const { desde, hasta } = getRango("semana", anchor);
      return `${fmtFechaCorta(desde)} — ${fmtFechaCorta(hasta)}, ${hasta.getFullYear()}`;
    }
    return `${MESES[anchor.getMonth()]} ${anchor.getFullYear()}`;
  })();

  const citasDelDia = (d: Date) => citas.filter(c => isSameDay(new Date(c.fecha_inicio), d));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 110px)" }}>

      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={navAnterior} style={navBtn}>‹</button>
          <button onClick={navSiguiente} style={navBtn}>›</button>
          <button onClick={irHoy} style={todayBtn}>Hoy</button>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginLeft: 8 }}>{titulo}</span>
          {loading && <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 8 }}>…</span>}
        </div>
        <div style={{ display: "flex", gap: 2, background: "#f3f4f6", borderRadius: 8, padding: 3 }}>
          {(["dia", "semana", "mes"] as Vista[]).map(v => (
            <button key={v} onClick={() => setVista(v)} style={{
              padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
              background: vista === v ? "white" : "transparent",
              color: vista === v ? "#111827" : "#6b7280",
              boxShadow: vista === v ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}>
              {v === "dia" ? "Día" : v === "semana" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar body */}
      <div style={{ flex: 1, overflow: "hidden", background: "white", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
        {(vista === "semana" || vista === "dia") && (
          <VistaHoras
            dias={vista === "semana"
              ? Array.from({ length: 7 }, (_, i) => addDays(getMonday(anchor), i))
              : [anchor]
            }
            today={today}
            citasDelDia={citasDelDia}
            onSelect={setSelectedCita}
          />
        )}
        {vista === "mes" && (
          <VistaMes
            year={anchor.getFullYear()}
            month={anchor.getMonth()}
            today={today}
            citasDelDia={citasDelDia}
            onSelect={setSelectedCita}
          />
        )}
      </div>

      {/* Modal detalle */}
      {selectedCita && (
        <ModalCita cita={selectedCita} onClose={() => setSelectedCita(null)} />
      )}
    </div>
  );
}

/* ─── Vista semana / día ─────────────────────────────────────────────────── */

function VistaHoras({
  dias, today, citasDelDia, onSelect,
}: {
  dias: Date[];
  today: Date;
  citasDelDia: (d: Date) => Cita[];
  onSelect: (c: Cita) => void;
}) {
  const horas = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => HORA_INICIO + i);
  const totalHeight = horas.length * HORA_HEIGHT;
  const isDay = dias.length === 1;

  // Hora actual para la línea roja
  const now = new Date();
  const nowMinutes = (now.getHours() - HORA_INICIO) * 60 + now.getMinutes();
  const nowTop = (nowMinutes / 60) * HORA_HEIGHT;
  const showNowLine = nowMinutes >= 0 && nowMinutes < (HORA_FIN - HORA_INICIO) * 60;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header días */}
      <div style={{ display: "flex", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
        <div style={{ width: 56, flexShrink: 0 }} />
        {dias.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <div key={i} style={{
              flex: 1, textAlign: "center", padding: "10px 0",
              borderLeft: "1px solid #f3f4f6",
            }}>
              <div style={{ fontSize: 11, color: isToday ? "#166534" : "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {DIAS_CORTO[(d.getDay() + 6) % 7]}
              </div>
              <div style={{
                fontSize: isDay ? 20 : 16, fontWeight: 700, marginTop: 2,
                color: isToday ? "white" : "#111827",
                background: isToday ? "#166534" : "transparent",
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

      {/* Scroll area */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", position: "relative" }}>
          {/* Horas columna izquierda */}
          <div style={{ width: 56, flexShrink: 0 }}>
            {horas.map(h => (
              <div key={h} style={{
                height: HORA_HEIGHT, display: "flex", alignItems: "flex-start",
                justifyContent: "flex-end", paddingRight: 8, paddingTop: 6,
                fontSize: 11, color: "#9ca3af",
              }}>
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Grid días */}
          <div style={{ flex: 1, position: "relative" }}>
            {/* Líneas horizontales */}
            {horas.map(h => (
              <div key={h} style={{
                position: "absolute", top: (h - HORA_INICIO) * HORA_HEIGHT,
                left: 0, right: 0, height: 1, background: "#f3f4f6",
              }} />
            ))}

            {/* Línea hora actual */}
            {showNowLine && (
              <div style={{
                position: "absolute", top: nowTop, left: 0, right: 0,
                height: 2, background: "#ef4444", zIndex: 10,
              }}>
                <div style={{
                  position: "absolute", left: -6, top: -4,
                  width: 10, height: 10, borderRadius: "50%", background: "#ef4444",
                }} />
              </div>
            )}

            {/* Columnas de días */}
            <div style={{ display: "flex", height: totalHeight }}>
              {dias.map((d, i) => {
                const dCitas = citasDelDia(d);
                return (
                  <div key={i} style={{
                    flex: 1, position: "relative", borderLeft: "1px solid #f3f4f6",
                  }}>
                    {dCitas.map(c => {
                      const start = new Date(c.fecha_inicio);
                      const end = c.fecha_fin ? new Date(c.fecha_fin) : new Date(start.getTime() + 60 * 60000);
                      const startMin = (start.getHours() - HORA_INICIO) * 60 + start.getMinutes();
                      const durMin = Math.max((end.getTime() - start.getTime()) / 60000, 30);
                      const top = Math.max(0, (startMin / 60) * HORA_HEIGHT);
                      const height = Math.max(24, (durMin / 60) * HORA_HEIGHT - 2);
                      const est = ESTADO_COLOR[c.estado] || ESTADO_COLOR.confirmada;
                      return (
                        <button
                          key={c.id}
                          onClick={() => onSelect(c)}
                          style={{
                            position: "absolute", left: 3, right: 3,
                            top, height,
                            background: est.bg, color: est.color,
                            border: `1px solid ${est.border}`,
                            borderRadius: 5, padding: "2px 6px",
                            fontSize: 11, fontWeight: 600,
                            textAlign: "left", overflow: "hidden",
                            cursor: "pointer", zIndex: 5,
                          }}
                        >
                          <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {fmtHora(start)} {c.tipo_servicio || "Cita"}
                          </div>
                          {height > 36 && c.pacientes?.nombre && (
                            <div style={{ fontSize: 10, opacity: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {c.pacientes.nombre}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Vista mes ──────────────────────────────────────────────────────────── */

function VistaMes({
  year, month, today, citasDelDia, onSelect,
}: {
  year: number;
  month: number;
  today: Date;
  citasDelDia: (d: Date) => Cita[];
  onSelect: (c: Cita) => void;
}) {
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #f3f4f6" }}>
        {DIAS_CORTO.map(d => (
          <div key={d} style={{ padding: "10px 0", textAlign: "center", fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", flex: 1 }}>
        {Array.from({ length: totalCells }).map((_, i) => {
          const dayNum = i - firstWeekday + 1;
          const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
          const cellDate = new Date(year, month, dayNum);
          const isToday = isCurrentMonth && isSameDay(cellDate, today);
          const dCitas = isCurrentMonth ? citasDelDia(cellDate) : [];

          return (
            <div key={i} style={{
              minHeight: 90, padding: "6px 8px",
              borderRight: (i + 1) % 7 !== 0 ? "1px solid #f3f4f6" : "none",
              borderBottom: i < totalCells - 7 ? "1px solid #f3f4f6" : "none",
              background: isToday ? "#f0fdf4" : (isCurrentMonth ? "white" : "#fafafa"),
            }}>
              {isCurrentMonth && (
                <>
                  <div style={{
                    fontSize: 12, fontWeight: isToday ? 700 : 400,
                    color: isToday ? "white" : "#374151",
                    width: 22, height: 22, borderRadius: "50%",
                    background: isToday ? "#166534" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 4,
                  }}>
                    {dayNum}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {dCitas.slice(0, 3).map(c => {
                      const est = ESTADO_COLOR[c.estado] || ESTADO_COLOR.confirmada;
                      const hora = fmtHora(new Date(c.fecha_inicio));
                      return (
                        <button key={c.id} onClick={() => onSelect(c)} style={{
                          background: est.bg, color: est.color,
                          border: "none", borderRadius: 3, padding: "2px 5px",
                          fontSize: 10, cursor: "pointer", textAlign: "left",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          fontWeight: 500, width: "100%",
                        }}>
                          {hora} {c.tipo_servicio || "Cita"}
                        </button>
                      );
                    })}
                    {dCitas.length > 3 && (
                      <span style={{ fontSize: 10, color: "#9ca3af" }}>+{dCitas.length - 3} más</span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Modal ──────────────────────────────────────────────────────────────── */

function ModalCita({ cita, onClose }: { cita: Cita; onClose: () => void }) {
  const est = ESTADO_COLOR[cita.estado] || ESTADO_COLOR.confirmada;
  const start = new Date(cita.fecha_inicio);
  const end = cita.fecha_fin ? new Date(cita.fecha_fin) : null;
  const durMin = end ? Math.round((end.getTime() - start.getTime()) / 60000) : null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
      }}
    >
      <div style={{
        background: "white", borderRadius: 12, padding: 28, width: 400,
        boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700 }}>{cita.tipo_servicio || "Cita"}</h3>
            <span style={{ fontSize: 12, background: est.bg, color: est.color, borderRadius: 10, padding: "2px 10px", fontWeight: 600 }}>
              {cita.estado}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9ca3af", lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          <InfoRow icon="👤" label="Paciente" value={cita.pacientes?.nombre || "—"} />
          <InfoRow icon="📞" label="Teléfono" value={cita.pacientes?.telefono || "—"} />
          <InfoRow icon="📅" label="Fecha" value={start.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })} />
          <InfoRow icon="🕐" label="Hora" value={`${fmtHora(start)}${end ? ` — ${fmtHora(end)}` : ""}`} />
          {durMin && <InfoRow icon="⏱" label="Duración" value={`${durMin} min`} />}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ color: "#9ca3af", minWidth: 70 }}>{label}</span>
      <span style={{ color: "#111827", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

/* ─── Estilos compartidos ────────────────────────────────────────────────── */

const navBtn: React.CSSProperties = {
  width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: 6, border: "1px solid #e5e7eb", background: "white",
  cursor: "pointer", fontSize: 18, color: "#374151", lineHeight: 1,
};

const todayBtn: React.CSSProperties = {
  fontSize: 13, padding: "5px 12px", borderRadius: 6,
  border: "1px solid #e5e7eb", background: "white", cursor: "pointer", color: "#374151",
};
