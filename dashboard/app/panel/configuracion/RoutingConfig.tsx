"use client";
import { useState } from "react";

const MODES = [
  {
    key: "siempre",
    label: "Siempre activo",
    desc: "El agente atiende las llamadas entrantes mientras el canal de voz esté correctamente activado.",
    icon: "📞",
    managed: false,
  },
  {
    key: "fuera_horario",
    label: "Solo fuera de horario",
    desc: "El agente solo contesta cuando la clínica está cerrada. Durante el horario de apertura, la llamada va a la recepción humana.",
    icon: "🌙",
    managed: true,
  },
  {
    key: "si_no_contestan",
    label: "Solo si no contestamos",
    desc: "El agente actúa como buzón inteligente. La llamada llega primero a la recepción y, si no contesta nadie en X segundos, pasa al agente.",
    icon: "🔁",
    managed: true,
  },
] as const;

type Mode = "siempre" | "fuera_horario" | "si_no_contestan";

interface Props {
  clinicId: string;
  initialMode: Mode;
}

export default function RoutingConfig({ clinicId, initialMode }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode || "siempre");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/clinicas/${clinicId}/configuracion/guardar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routing_mode: mode }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Error al guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const selectedManaged = MODES.find(m => m.key === mode)?.managed;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: "#111827" }}>
          Routing de llamadas
        </h2>
        <p style={{ margin: 0, fontSize: 13.5, color: "#6b7280" }}>
          Define cuándo actúa el agente de voz. Los modos avanzados los configuramos nosotros en la central telefónica.
        </p>
      </div>

      {/* Mode selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {MODES.map(m => {
          const selected = mode === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                padding: "16px 18px",
                border: `2px solid ${selected ? "#2563eb" : "#e5e7eb"}`,
                borderRadius: 12,
                background: selected ? "#eff6ff" : "white",
                cursor: "pointer", textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1, marginTop: 1 }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  marginBottom: 4,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: selected ? "#1d4ed8" : "#111827" }}>
                    {m.label}
                  </span>
                  {m.managed && (
                    <span style={{
                      fontSize: 10.5, fontWeight: 600, color: "#7c3aed",
                      background: "#ede9fe", padding: "2px 7px", borderRadius: 20,
                    }}>
                      Gestionado por nosotros
                    </span>
                  )}
                  {selected && (
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, color: "#1d4ed8",
                      background: "#dbeafe", padding: "2px 7px", borderRadius: 20, marginLeft: "auto",
                    }}>
                      ✓ Seleccionado
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>
                  {m.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {selectedManaged && (
        <div style={{
          background: "#fef9c3", border: "1px solid #fde68a",
          borderRadius: 10, padding: "12px 16px", marginBottom: 24,
          fontSize: 13, color: "#92400e", lineHeight: 1.6,
        }}>
          <strong>Requiere configuración en la central telefónica.</strong>{" "}
          Guardar registra tu preferencia, pero el modo no se considera operativo hasta que nuestro equipo
          confirme por escrito que el desvío se ha aplicado y probado en Telnyx.
        </div>
      )}

      {/* Save */}
      {error && (
        <p style={{
          marginBottom: 12, padding: "10px 14px",
          background: "#fef2f2", border: "1px solid #fca5a5",
          borderRadius: 8, fontSize: 13, color: "#991b1b",
        }}>
          {error}
        </p>
      )}

      <button
        onClick={save}
        disabled={saving}
        style={{
          background: saved ? "#16a34a" : "linear-gradient(135deg, #2563eb, #4f46e5)",
          color: "white", border: "none", borderRadius: 9,
          padding: "11px 24px", fontSize: 14, fontWeight: 600,
          cursor: saving ? "wait" : "pointer",
          opacity: saving ? 0.7 : 1,
          transition: "background 0.3s",
        }}
      >
        {saving ? "Guardando…" : saved ? "✓ Guardado" : "Guardar configuración"}
      </button>
    </div>
  );
}
