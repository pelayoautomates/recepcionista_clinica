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

const ESTADO_COLOR: Record<string, { bg: string; color: string }> = {
  confirmada: { bg: "#dcfce7", color: "#166534" },
  cancelada: { bg: "#fee2e2", color: "#991b1b" },
  completada: { bg: "#e0e7ff", color: "#3730a3" },
  pendiente: { bg: "#fef9c3", color: "#854d0e" },
};

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function CalendarioCliente({ clinicId, backendUrl }: { clinicId: string; backendUrl: string }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCita, setSelectedCita] = useState<Cita | null>(null);

  const fetchCitas = useCallback(async (y: number, m: number) => {
    setLoading(true);
    const firstDay = `${y}-${String(m + 1).padStart(2, "0")}-01T00:00:00Z`;
    const lastDay = new Date(y, m + 1, 0);
    const lastIso = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}T23:59:59Z`;
    try {
      const res = await fetch(
        `${backendUrl}/admin/clinicas/${clinicId}/citas?fecha_inicio=${firstDay}&fecha_fin=${lastIso}`,
        { cache: "no-store" }
      );
      if (res.ok) setCitas(await res.json());
    } finally {
      setLoading(false);
    }
  }, [clinicId, backendUrl]);

  useEffect(() => { fetchCitas(year, month); }, [year, month, fetchCitas]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  // Build calendar grid (Mon-Sun)
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0=Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const citasByDay: Record<number, Cita[]> = {};
  citas.forEach((c) => {
    const d = new Date(c.fecha_inicio);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!citasByDay[day]) citasByDay[day] = [];
      citasByDay[day].push(c);
    }
  });

  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, margin: 0, fontWeight: 700 }}>Calendario de citas</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={prevMonth} style={navBtnStyle}>‹</button>
          <span style={{ fontSize: 16, fontWeight: 600, minWidth: 160, textAlign: "center" }}>
            {MESES[month]} {year}
          </span>
          <button onClick={nextMonth} style={navBtnStyle}>›</button>
          <button
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
            style={{
              fontSize: 13, padding: "6px 14px", borderRadius: 6,
              border: "1px solid #d1d5db", background: "white", cursor: "pointer", color: "#374151",
            }}
          >
            Hoy
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Total citas", value: citas.length },
          { label: "Confirmadas", value: citas.filter(c => c.estado === "confirmada").length },
          { label: "Canceladas", value: citas.filter(c => c.estado === "cancelada").length },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: "white", borderRadius: 8, padding: "10px 18px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex", gap: 8, alignItems: "center",
          }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{value}</span>
            <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
          </div>
        ))}
        {loading && (
          <div style={{ fontSize: 12, color: "#9ca3af", alignSelf: "center", marginLeft: 8 }}>Cargando…</div>
        )}
      </div>

      {/* Calendar grid */}
      <div style={{ background: "white", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #f3f4f6" }}>
          {DIAS.map((d) => (
            <div key={d} style={{
              padding: "10px 0", textAlign: "center", fontSize: 11, fontWeight: 600,
              color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {Array.from({ length: totalCells }).map((_, i) => {
            const dayNum = i - firstWeekday + 1;
            const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
            const isToday = isCurrentMonth &&
              dayNum === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const dayCitas = isCurrentMonth ? (citasByDay[dayNum] || []) : [];
            const borderRight = (i + 1) % 7 !== 0 ? "1px solid #f3f4f6" : "none";
            const borderBottom = i < totalCells - 7 ? "1px solid #f3f4f6" : "none";

            return (
              <div key={i} style={{
                minHeight: 100, padding: "8px 8px 6px",
                borderRight, borderBottom,
                background: isToday ? "#f0fdf4" : (isCurrentMonth ? "white" : "#fafafa"),
                verticalAlign: "top",
              }}>
                <div style={{
                  fontSize: 13, fontWeight: isToday ? 700 : 400,
                  color: isToday ? "#166534" : (isCurrentMonth ? "#374151" : "#d1d5db"),
                  marginBottom: 4,
                  width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: "50%", background: isToday ? "#bbf7d0" : "transparent",
                }}>
                  {isCurrentMonth ? dayNum : ""}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {dayCitas.slice(0, 3).map((c) => {
                    const est = ESTADO_COLOR[c.estado] || { bg: "#f3f4f6", color: "#374151" };
                    const hora = new Date(c.fecha_inicio).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCita(c)}
                        style={{
                          background: est.bg, color: est.color,
                          border: "none", borderRadius: 4, padding: "2px 5px",
                          fontSize: 10, cursor: "pointer", textAlign: "left",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          fontWeight: 500,
                        }}
                      >
                        {hora} {c.tipo_servicio || "Cita"}
                      </button>
                    );
                  })}
                  {dayCitas.length > 3 && (
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>+{dayCitas.length - 3} más</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {selectedCita && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedCita(null); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
          }}
        >
          <div style={{
            background: "white", borderRadius: 12, padding: 28,
            width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{selectedCita.tipo_servicio || "Cita"}</h3>
              <button onClick={() => setSelectedCita(null)} style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9ca3af", lineHeight: 1,
              }}>✕</button>
            </div>
            {(() => {
              const est = ESTADO_COLOR[selectedCita.estado] || { bg: "#f3f4f6", color: "#374151" };
              return (
                <span style={{ fontSize: 12, background: est.bg, color: est.color, borderRadius: 10, padding: "3px 10px", fontWeight: 600 }}>
                  {selectedCita.estado}
                </span>
              );
            })()}
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <ModalRow label="Paciente" value={selectedCita.pacientes?.nombre || "—"} />
              <ModalRow label="Teléfono" value={selectedCita.pacientes?.telefono || "—"} />
              <ModalRow label="Inicio" value={fmtDT(selectedCita.fecha_inicio)} />
              {selectedCita.fecha_fin && <ModalRow label="Fin" value={fmtDT(selectedCita.fecha_fin)} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "#9ca3af" }}>{label}</span>
      <span style={{ color: "#111827", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

const navBtnStyle: React.CSSProperties = {
  width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
  borderRadius: 6, border: "1px solid #d1d5db", background: "white", cursor: "pointer",
  fontSize: 18, color: "#374151", lineHeight: 1,
};
