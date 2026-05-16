"use client";

import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayPoint {
  fecha: string;
  conversaciones: number;
  citas: number;
  leads: number;
}

interface AnalyticsData {
  serie_diaria: DayPoint[];
  por_canal: Record<string, number>;
  estados_citas: Record<string, number>;
  estado_leads: Record<string, number>;
  horas_pico: { hora: number; count: number }[];
  tasa_conversion: number;
  escalaciones: number;
  totales: {
    conversaciones: number;
    citas: number;
    leads: number;
    minutos_usados: number;
    minutos_incluidos: number;
  };
}

interface Props {
  clinicId: string;
  initialData: AnalyticsData | null;
  clinicaNombre: string;
}

// ─── Chart: Activity Line ─────────────────────────────────────────────────────

function LineChart({ data }: { data: DayPoint[] }) {
  const W = 600, H = 170;
  const PAD = { top: 20, right: 20, bottom: 32, left: 38 };
  const pW = W - PAD.left - PAD.right;
  const pH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.flatMap(d => [d.conversaciones, d.citas, d.leads]), 1);
  const n = data.length;

  const cx = (i: number) => PAD.left + (n < 2 ? pW / 2 : (i / (n - 1)) * pW);
  const cy = (v: number) => PAD.top + (1 - v / maxVal) * pH;

  const line = (key: keyof DayPoint) =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${cx(i).toFixed(1)},${cy(d[key] as number).toFixed(1)}`).join(" ");

  const area = (key: keyof DayPoint) =>
    line(key) +
    ` L${cx(n - 1).toFixed(1)},${(PAD.top + pH).toFixed(1)} L${PAD.left},${(PAD.top + pH).toFixed(1)} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const xStep = n > 15 ? Math.ceil(n / 7) : n > 7 ? 2 : 1;

  const series = [
    { key: "conversaciones" as const, color: "#2563eb", label: "Conversaciones" },
    { key: "citas" as const, color: "#10b981", label: "Citas" },
    { key: "leads" as const, color: "#7c3aed", label: "Leads" },
  ];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          {series.map(s => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {yTicks.map(p => {
          const yy = PAD.top + p * pH;
          return (
            <g key={p}>
              <line x1={PAD.left} y1={yy} x2={W - PAD.right} y2={yy} stroke="#f3f4f6" strokeWidth="1" />
              <text x={PAD.left - 6} y={yy + 3.5} textAnchor="end" fontSize="9.5" fill="#c4c9d4">
                {Math.round((1 - p) * maxVal)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          if (i % xStep !== 0 && i !== n - 1) return null;
          const dt = new Date(d.fecha + "T00:00:00");
          const label = dt.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
          return (
            <text key={i} x={cx(i)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize="9.5" fill="#c4c9d4">
              {label}
            </text>
          );
        })}

        {series.map(s => (
          <g key={s.key}>
            <path d={area(s.key)} fill={`url(#grad-${s.key})`} />
            <path d={line(s.key)} stroke={s.color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {n > 0 && (
              <circle
                cx={cx(n - 1)}
                cy={cy(data[n - 1][s.key] as number)}
                r="3.5"
                fill={s.color}
              />
            )}
          </g>
        ))}
      </svg>

      <div style={{ display: "flex", gap: 20, paddingLeft: 38, marginTop: 4 }}>
        {series.map(s => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 20, height: 2.5, background: s.color, borderRadius: 2 }} />
            <span style={{ fontSize: 11.5, color: "#9ca3af", fontWeight: 500 }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chart: Donut ─────────────────────────────────────────────────────────────

function DonutChart({ segments }: {
  segments: { label: string; value: number; color: string; icon: string }[];
}) {
  const R = 52, CX = 72, CY = 72;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const circ = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <svg viewBox="0 0 144 144" style={{ width: 144, height: 144, flexShrink: 0 }}>
        {total === 0 ? (
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f3f4f6" strokeWidth="18" />
        ) : (
          segments.filter(s => s.value > 0).map((seg, i) => {
            const dash = (seg.value / total) * circ;
            const rotate = (offset / total) * 360 - 90;
            offset += seg.value;
            return (
              <circle
                key={i}
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke={seg.color}
                strokeWidth="18"
                strokeDasharray={`${dash} ${circ}`}
                transform={`rotate(${rotate} ${CX} ${CY})`}
                strokeLinecap="butt"
              />
            );
          })
        )}
        <circle cx={CX} cy={CY} r={R - 9} fill="white" />
        <text x={CX} y={CY - 7} textAnchor="middle" fontSize="20" fontWeight="800" fill="#111827">{total}</text>
        <text x={CX} y={CY + 10} textAnchor="middle" fontSize="9.5" fill="#9ca3af">total</text>
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {segments.map(seg => (
          <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: seg.color + "22",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14,
            }}>
              {seg.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{seg.label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <div style={{
                  height: 4, borderRadius: 2, background: seg.color,
                  width: `${total > 0 ? Math.round((seg.value / total) * 100) : 0}%`,
                  minWidth: seg.value > 0 ? 4 : 0,
                  transition: "width 0.4s ease",
                  maxWidth: "100%",
                }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>
                  {seg.value} <span style={{ color: "#9ca3af", fontWeight: 400 }}>
                    ({total > 0 ? Math.round((seg.value / total) * 100) : 0}%)
                  </span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chart: Hours Heatmap ─────────────────────────────────────────────────────

function HoursHeatmap({ horas }: { horas: { hora: number; count: number }[] }) {
  const max = Math.max(...horas.map(h => h.count), 1);

  const getColor = (count: number) => {
    if (count === 0) return "#f9fafb";
    const intensity = count / max;
    if (intensity < 0.25) return "#dbeafe";
    if (intensity < 0.5) return "#93c5fd";
    if (intensity < 0.75) return "#3b82f6";
    return "#1d4ed8";
  };

  const getTextColor = (count: number) => {
    const intensity = count / max;
    return intensity >= 0.5 ? "white" : "#374151";
  };

  return (
    <div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(12, 1fr)",
        gap: 4,
      }}>
        {horas.map(({ hora, count }) => (
          <div
            key={hora}
            title={`${hora}:00 — ${count} conversaciones`}
            style={{
              background: getColor(count),
              borderRadius: 6,
              padding: "8px 4px",
              textAlign: "center",
              cursor: "default",
              transition: "transform 0.1s",
            }}
          >
            <div style={{ fontSize: 9.5, color: getTextColor(count), fontWeight: 600, marginBottom: 2 }}>
              {hora}h
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: getTextColor(count) }}>
              {count}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>Menos</span>
        {["#f9fafb", "#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8"].map(c => (
          <div key={c} style={{ width: 16, height: 16, borderRadius: 4, background: c, border: "1px solid #e5e7eb" }} />
        ))}
        <span style={{ fontSize: 11, color: "#9ca3af" }}>Más</span>
      </div>
    </div>
  );
}

// ─── Chart: Lead Funnel ───────────────────────────────────────────────────────

function LeadFunnel({ estados }: { estados: Record<string, number> }) {
  const stages = [
    { key: "nuevo", label: "Nuevos leads", color: "#7c3aed", icon: "✦" },
    { key: "contactado", label: "Contactados", color: "#2563eb", icon: "✉" },
    { key: "cita_agendada", label: "Cita agendada", color: "#10b981", icon: "✓" },
    { key: "perdido", label: "Perdidos", color: "#f87171", icon: "✕" },
  ];

  const total = Math.max(Object.values(estados).reduce((a, b) => a + b, 0), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {stages.map(s => {
        const val = estados[s.key] || 0;
        const pct = Math.round((val / total) * 100);
        return (
          <div key={s.key}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: s.color + "20", color: s.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700,
                }}>
                  {s.icon}
                </span>
                <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{s.label}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "#111827" }}>{val}</span>
                <span style={{ fontSize: 11.5, color: "#9ca3af", minWidth: 32, textAlign: "right" }}>{pct}%</span>
              </div>
            </div>
            <div style={{ height: 7, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 4,
                background: s.color,
                width: `${pct}%`,
                transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon, gradient, trend
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  gradient: string;
  trend?: { value: number | null; label: string };
}) {
  return (
    <div style={{
      background: "white",
      borderRadius: 16,
      padding: "22px 22px 18px",
      border: "1px solid #e5e7eb",
      boxShadow: "0 1px 4px rgba(15,23,42,0.05)",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 90, height: 90, borderRadius: "50%",
        background: gradient,
        opacity: 0.08,
      }} />
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: gradient,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, marginBottom: 14,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: "#111827", letterSpacing: "-0.04em", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12.5, color: "#6b7280", fontWeight: 500, marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 4 }}>{sub}</div>}
      {trend && (
        <div style={{
          marginTop: 10, display: "flex", alignItems: "center", gap: 4,
          fontSize: 11.5, fontWeight: 600,
          color: trend.value === null ? "#9ca3af" : trend.value >= 0 ? "#10b981" : "#f87171",
        }}>
          {trend.value !== null && trend.value !== 0 && (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              {trend.value > 0
                ? <path d="M1.5 8L5.5 3L9.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                : <path d="M1.5 3L5.5 8L9.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              }
            </svg>
          )}
          {trend.label}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EstadisticasClient({ clinicId, initialData, clinicaNombre }: Props) {
  const [dias, setDias] = useState<7 | 30>(30);
  const [data, setData] = useState<AnalyticsData | null>(initialData);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (d: 7 | 30) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clinicas/${clinicId}/analytics?dias=${d}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  const handlePeriod = (d: 7 | 30) => {
    setDias(d);
    fetchData(d);
  };

  if (!data) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, color: "#9ca3af", fontSize: 14 }}>
        Sin datos disponibles aún.
      </div>
    );
  }

  const { totales, por_canal, estado_leads, horas_pico, tasa_conversion, escalaciones, serie_diaria } = data;

  const minutosPct = totales.minutos_incluidos > 0
    ? Math.round((totales.minutos_usados / totales.minutos_incluidos) * 100)
    : 0;

  const canalSegments = [
    { label: "Chat web", value: por_canal["chat_web"] || 0, color: "#2563eb", icon: "💬" },
    { label: "Llamadas", value: por_canal["voz"] || 0, color: "#7c3aed", icon: "📞" },
    { label: "WhatsApp", value: por_canal["whatsapp"] || 0, color: "#10b981", icon: "📱" },
  ];

  const cardStyle = {
    background: "white",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 4px rgba(15,23,42,0.05)",
    padding: "22px 24px",
  };

  const cardHeader = (title: string, sub?: string) => (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111827", letterSpacing: "-0.01em" }}>{title}</h2>
      {sub && <p style={{ margin: "3px 0 0", fontSize: 12, color: "#9ca3af" }}>{sub}</p>}
    </div>
  );

  return (
    <div style={{ opacity: loading ? 0.6 : 1, transition: "opacity 0.2s" }}>

      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em" }}>
            Estadísticas <span style={{ fontSize: 18 }}>✦</span>
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: "#6b7280" }}>
            Visión global de tu recepcionista IA — {clinicaNombre}
          </p>
        </div>

        {/* Period selector */}
        <div style={{
          display: "flex", background: "#f3f4f6",
          borderRadius: 10, padding: 3, gap: 2,
        }}>
          {([7, 30] as const).map(d => (
            <button
              key={d}
              onClick={() => handlePeriod(d)}
              style={{
                padding: "7px 18px",
                borderRadius: 8, border: "none",
                background: dias === d ? "white" : "transparent",
                color: dias === d ? "#111827" : "#6b7280",
                fontWeight: dias === d ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: dias === d ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s",
                fontFamily: "inherit",
              }}
            >
              {d} días
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <KpiCard
          label="Conversaciones"
          value={totales.conversaciones}
          sub={`últimos ${dias} días`}
          icon="💬"
          gradient="linear-gradient(135deg, #dbeafe, #bfdbfe)"
        />
        <KpiCard
          label="Citas agendadas IA"
          value={totales.citas}
          sub={`últimos ${dias} días`}
          icon="📅"
          gradient="linear-gradient(135deg, #d1fae5, #a7f3d0)"
        />
        <KpiCard
          label="Tasa de conversión"
          value={`${tasa_conversion}%`}
          sub="leads → cita"
          icon="🎯"
          gradient="linear-gradient(135deg, #ede9fe, #ddd6fe)"
        />
        <KpiCard
          label="Minutos IA usados"
          value={`${totales.minutos_usados}`}
          sub={`de ${totales.minutos_incluidos} incluidos (${minutosPct}%)`}
          icon="⏱"
          gradient="linear-gradient(135deg, #fef3c7, #fde68a)"
          trend={{
            value: minutosPct >= 80 ? -1 : 0,
            label: minutosPct >= 90 ? "Límite próximo" : minutosPct >= 80 ? "Consumo alto" : "Consumo normal",
          }}
        />
      </div>

      {/* Activity chart + Channel breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, marginBottom: 16 }}>

        {/* Line chart */}
        <div style={cardStyle}>
          {cardHeader("Actividad diaria", `Conversaciones, citas y leads — últimos ${dias} días`)}
          <LineChart data={serie_diaria} />
        </div>

        {/* Channel donut */}
        <div style={cardStyle}>
          {cardHeader("Por canal")}
          <DonutChart segments={canalSegments} />

          {/* Escalaciones */}
          <div style={{
            marginTop: 20, paddingTop: 16,
            borderTop: "1px solid #f3f4f6",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: escalaciones > 0 ? "#fef3c7" : "#f3f4f6",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14,
              }}>
                🔔
              </div>
              <span style={{ fontSize: 13, color: "#6b7280" }}>Escalaciones a humano</span>
            </div>
            <span style={{
              fontSize: 16, fontWeight: 800, color: escalaciones > 0 ? "#f59e0b" : "#111827",
            }}>
              {escalaciones}
            </span>
          </div>
        </div>
      </div>

      {/* Lead funnel + Hours heatmap */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Lead funnel */}
        <div style={cardStyle}>
          {cardHeader("Embudo de leads", `Progresión de ${totales.leads} leads en ${dias} días`)}
          <LeadFunnel estados={estado_leads} />
        </div>

        {/* Horas pico */}
        <div style={cardStyle}>
          {cardHeader("Horas pico", "Conversaciones por hora del día (hora Madrid)")}
          <HoursHeatmap horas={horas_pico} />

          {/* Most active hour */}
          {(() => {
            const peak = horas_pico.reduce((best, h) => h.count > best.count ? h : best, horas_pico[0]);
            if (!peak || peak.count === 0) return null;
            return (
              <div style={{
                marginTop: 14, paddingTop: 14, borderTop: "1px solid #f3f4f6",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                    Hora pico: {peak.hora}:00–{peak.hora + 1}:00
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    {peak.count} conversaciones en ese intervalo
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

    </div>
  );
}
