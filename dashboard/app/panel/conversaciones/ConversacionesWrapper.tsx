"use client";
import { useState, useMemo } from "react";
import Link from "next/link";

type Conv = {
  id: string;
  canal: string | null;
  estado: string;
  updated_at: string;
  pacientes?: { nombre?: string } | null;
  paciente_id?: string | null;
};

const ESTADO_STYLE: Record<string, { bg: string; color: string }> = {
  activa:            { bg: "#dcfce7", color: "#166534" },
  esperando_humano:  { bg: "#fef3c7", color: "#92400e" },
  resuelta:          { bg: "#f3f4f6", color: "#6b7280" },
};

const ESTADO_LABEL: Record<string, string> = {
  activa: "Activa",
  esperando_humano: "Esperando humano",
  resuelta: "Resuelta",
};

const CANAL_LABEL: Record<string, string> = {
  chat_web: "Chat web", whatsapp: "WhatsApp", voz: "Llamada",
};

const CANAL_ICON: Record<string, string> = {
  chat_web: "💬", whatsapp: "📱", voz: "📞",
};

type FiltroPeriodo = "hoy" | "7d" | "30d" | "todo";
type FiltroCanal = "todos" | "chat_web" | "whatsapp" | "voz";
type FiltroEstado = "todos" | "activa" | "esperando_humano" | "resuelta";

interface Props {
  conversaciones: Conv[];
  clinicId: string;
  esperando: number;
}

function isWithinDays(dateStr: string, days: number): boolean {
  const ms = days * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(dateStr).getTime() <= ms;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export default function ConversacionesWrapper({ conversaciones, clinicId, esperando }: Props) {
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>("todo");
  const [filtroCanal, setFiltroCanal] = useState<FiltroCanal>("todos");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");

  const filtradas = useMemo(() => {
    return conversaciones.filter(conv => {
      if (filtroCanal !== "todos" && conv.canal !== filtroCanal) return false;
      if (filtroEstado !== "todos" && conv.estado !== filtroEstado) return false;
      if (filtroPeriodo === "hoy" && !isToday(conv.updated_at)) return false;
      if (filtroPeriodo === "7d" && !isWithinDays(conv.updated_at, 7)) return false;
      if (filtroPeriodo === "30d" && !isWithinDays(conv.updated_at, 30)) return false;
      return true;
    });
  }, [conversaciones, filtroCanal, filtroEstado, filtroPeriodo]);

  const chipStyle = (active: boolean, color?: string): React.CSSProperties => ({
    padding: "5px 12px",
    fontSize: 12.5,
    fontWeight: active ? 600 : 500,
    color: active ? (color || "#2563eb") : "#6b7280",
    background: active ? (color ? color + "15" : "#eff6ff") : "white",
    border: `1px solid ${active ? (color || "#bfdbfe") : "#e5e7eb"}`,
    borderRadius: 20,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap" as const,
    transition: "all 0.12s",
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, margin: 0, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em" }}>
            Conversaciones
          </h1>
          {esperando > 0 && (
            <span style={{ background: "#f59e0b", color: "white", borderRadius: 12, padding: "4px 14px", fontSize: 13, fontWeight: 600 }}>
              {esperando} esperando respuesta
            </span>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {/* Period */}
          <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 22, padding: 3 }}>
            {([["hoy", "Hoy"], ["7d", "7 días"], ["30d", "30 días"], ["todo", "Todo"]] as [FiltroPeriodo, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setFiltroPeriodo(k)} style={{
                padding: "4px 12px", borderRadius: 18, border: "none", cursor: "pointer",
                fontSize: 12.5, fontWeight: filtroPeriodo === k ? 600 : 500,
                background: filtroPeriodo === k ? "white" : "transparent",
                color: filtroPeriodo === k ? "#111827" : "#6b7280",
                boxShadow: filtroPeriodo === k ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                fontFamily: "inherit", transition: "all 0.12s",
              }}>{l}</button>
            ))}
          </div>

          <div style={{ width: 1, background: "#e5e7eb", margin: "0 2px" }} />

          {/* Canal */}
          {([["todos", "Todos los canales"], ["chat_web", "💬 Chat web"], ["whatsapp", "📱 WhatsApp"], ["voz", "📞 Llamadas"]] as [FiltroCanal, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setFiltroCanal(k)} style={chipStyle(filtroCanal === k)}>
              {l}
            </button>
          ))}

          <div style={{ width: 1, background: "#e5e7eb", margin: "0 2px" }} />

          {/* Estado */}
          {([
            ["todos", "Todos", undefined],
            ["activa", "Activa", "#166534"],
            ["esperando_humano", "Esperando humano", "#92400e"],
            ["resuelta", "Resuelta", "#6b7280"],
          ] as [FiltroEstado, string, string | undefined][]).map(([k, l, c]) => (
            <button key={k} onClick={() => setFiltroEstado(k)} style={chipStyle(filtroEstado === k, c)}>
              {l}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12.5, color: "#9ca3af" }}>
          {filtradas.length} conversaci{filtradas.length === 1 ? "ón" : "ones"}
          {filtradas.length !== conversaciones.length && ` (de ${conversaciones.length} totales)`}
        </div>
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtradas.map(conv => {
          const estilo = ESTADO_STYLE[conv.estado] || ESTADO_STYLE.resuelta;
          const hora = new Date(conv.updated_at).toLocaleString("es-ES", {
            day: "2-digit", month: "2-digit",
            hour: "2-digit", minute: "2-digit",
            timeZone: "Europe/Madrid",
          });
          const nombre = conv.pacientes?.nombre || (conv.paciente_id ? `ID: ${conv.paciente_id.slice(0, 6)}` : "Desconocido");
          const canal = conv.canal || "chat_web";
          return (
            <Link key={conv.id} href={`/panel/conversaciones/${conv.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                background: "white", borderRadius: 10, padding: "14px 18px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                border: conv.estado === "esperando_humano" ? "1.5px solid #f59e0b" : "1px solid #e5e7eb",
                cursor: "pointer", transition: "box-shadow 0.12s",
              }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "#f3f4f6",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, flexShrink: 0,
                  }}>
                    {CANAL_ICON[canal] || "💬"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{nombre}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>
                      {CANAL_LABEL[canal] || canal} · {hora}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ background: estilo.bg, color: estilo.color, borderRadius: 12, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
                    {ESTADO_LABEL[conv.estado] || conv.estado}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5 3l4 4-4 4" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
        {filtradas.length === 0 && (
          <div style={{ background: "white", borderRadius: 10, padding: 48, textAlign: "center", color: "#9ca3af", border: "1px solid #e5e7eb" }}>
            {conversaciones.length === 0 ? "No hay conversaciones todavía" : "No hay conversaciones con estos filtros"}
          </div>
        )}
      </div>
    </div>
  );
}
