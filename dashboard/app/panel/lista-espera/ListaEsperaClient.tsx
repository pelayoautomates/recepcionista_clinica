"use client";
import { useState } from "react";

type Entrada = {
  id: string;
  paciente_id: string | null;
  servicio_nombre: string | null;
  notas: string | null;
  estado: "esperando" | "notificado" | "agendado" | "cancelado";
  notificado_at: string | null;
  created_at: string;
  pacientes?: { nombre: string | null; telefono: string | null; email: string | null; canal_origen: string | null } | null;
};

const ESTADO_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  esperando:  { label: "Esperando",  bg: "#dbeafe", color: "#1d4ed8" },
  notificado: { label: "Notificado", bg: "#fef3c7", color: "#92400e" },
  agendado:   { label: "Agendado",   bg: "#dcfce7", color: "#166534" },
  cancelado:  { label: "Cancelado",  bg: "#fee2e2", color: "#991b1b" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export default function ListaEsperaClient({
  clinicId, initialLista,
}: { clinicId: string; initialLista: Entrada[] }) {
  const [lista, setLista] = useState<Entrada[]>(initialLista);
  const [notificando, setNotificando] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);

  const activos = lista.filter(e => e.estado === "esperando").length;

  async function notificar(entrada: Entrada) {
    if (!entrada.pacientes?.telefono) {
      alert("Este paciente no tiene teléfono registrado.");
      return;
    }
    setNotificando(entrada.id);
    const now = new Date().toISOString();
    const res = await fetch(`/api/clinicas/${clinicId}/lista-espera/${entrada.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "notificado", notificado_at: now }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLista(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));
    }
    setNotificando(null);
  }

  async function marcarEstado(entradaId: string, estado: string) {
    const res = await fetch(`/api/clinicas/${clinicId}/lista-espera/${entradaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (res.ok) {
      const updated = await res.json();
      setLista(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));
    }
  }

  async function eliminar(entradaId: string) {
    if (!confirm("¿Eliminar esta entrada de la lista de espera?")) return;
    setEliminando(entradaId);
    await fetch(`/api/clinicas/${clinicId}/lista-espera/${entradaId}`, { method: "DELETE" });
    setLista(prev => prev.filter(e => e.id !== entradaId));
    setEliminando(null);
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#111827" }}>
          Lista de espera
        </h1>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
          Pacientes que quieren cita pero no había disponibilidad.
          {activos > 0 && ` ${activos} esperando hueco.`}
        </p>
      </div>

      {lista.length === 0 ? (
        <div style={{
          background: "white", border: "1px solid #e5e7eb", borderRadius: 12,
          padding: "48px 24px", textAlign: "center",
        }}>
          <p style={{ margin: "0 0 8px", fontSize: 32 }}>✅</p>
          <p style={{ margin: 0, color: "#9ca3af", fontSize: 14 }}>
            La lista de espera está vacía. El agente IA añade pacientes automáticamente cuando no hay disponibilidad.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lista.map(entrada => {
            const pac = entrada.pacientes;
            const est = ESTADO_CONFIG[entrada.estado] ?? ESTADO_CONFIG.esperando;
            return (
              <div key={entrada.id} style={{
                background: "white", border: "1px solid #e5e7eb", borderRadius: 12,
                padding: "16px 20px",
                opacity: entrada.estado === "cancelado" ? 0.55 : 1,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{
                        fontSize: 11.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                        background: est.bg, color: est.color,
                      }}>
                        {est.label}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>
                        {pac?.nombre || "Anónimo"}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      {entrada.servicio_nombre && <span>Servicio: <strong>{entrada.servicio_nombre}</strong> · </span>}
                      {pac?.telefono && <span>{pac.telefono} · </span>}
                      En espera desde {fmtDate(entrada.created_at)}
                    </div>
                    {entrada.notas && (
                      <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "#9ca3af" }}>{entrada.notas}</p>
                    )}
                    {entrada.notificado_at && (
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#059669" }}>
                        Notificado el {fmtDate(entrada.notificado_at)}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                    {entrada.estado === "esperando" && (
                      <button
                        onClick={() => notificar(entrada)}
                        disabled={notificando === entrada.id}
                        style={{ ...btnPrimary, opacity: notificando === entrada.id ? 0.6 : 1 }}
                      >
                        {notificando === entrada.id ? "Enviando..." : "Notificar"}
                      </button>
                    )}
                    {entrada.estado === "notificado" && (
                      <button onClick={() => marcarEstado(entrada.id, "agendado")} style={btnGhost}>
                        Marcar agendado
                      </button>
                    )}
                    {(entrada.estado === "esperando" || entrada.estado === "notificado") && (
                      <button onClick={() => marcarEstado(entrada.id, "cancelado")} style={{ ...btnGhost, color: "#dc2626" }}>
                        Cancelar
                      </button>
                    )}
                    <button
                      onClick={() => eliminar(entrada.id)}
                      disabled={eliminando === entrada.id}
                      style={{ ...btnGhost, color: "#9ca3af" }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "7px 14px", borderRadius: 7, border: "none", background: "#2563eb",
  color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const btnGhost: React.CSSProperties = {
  padding: "7px 14px", borderRadius: 7, border: "1px solid #e5e7eb", background: "white",
  color: "#374151", fontWeight: 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
