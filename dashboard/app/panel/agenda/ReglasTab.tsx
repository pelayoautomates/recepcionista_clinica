"use client";
import { useState } from "react";

type Reglas = {
  antelacion_min_horas: number;
  max_dias_adelante: number;
  intervalo_slots_min: number;
  permite_mismo_dia: boolean;
  permite_cancelacion_ia: boolean;
  permite_reprogramacion_ia: boolean;
  horas_limite_cancelar: number;
  horas_limite_reprogramar: number;
  max_citas_simultaneas: number;
};

const DEFAULTS: Reglas = {
  antelacion_min_horas: 1,
  max_dias_adelante: 60,
  intervalo_slots_min: 30,
  permite_mismo_dia: true,
  permite_cancelacion_ia: true,
  permite_reprogramacion_ia: true,
  horas_limite_cancelar: 24,
  horas_limite_reprogramar: 24,
  max_citas_simultaneas: 1,
};

export default function ReglasTab({
  clinicId, initialReglas,
}: { clinicId: string; initialReglas: Record<string, any> }) {
  const [reglas, setReglas] = useState<Reglas>({ ...DEFAULTS, ...initialReglas });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function save() {
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/clinicas/${clinicId}/reglas`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reglas),
      });
      if (!res.ok) throw new Error(await res.text());
      setNotice({ type: "success", text: "Reglas guardadas correctamente." });
    } catch {
      setNotice({ type: "error", text: "No se pudieron guardar las reglas." });
    } finally { setSaving(false); }
  }

  function num(field: keyof Reglas) {
    return (
      <input
        type="number"
        style={inputStyle}
        value={reglas[field] as number}
        onChange={e => setReglas({ ...reglas, [field]: Number(e.target.value) })}
        min={0}
      />
    );
  }

  function bool(field: keyof Reglas, label: string, desc: string) {
    return (
      <div style={{
        background: "white", border: "1px solid #e5e7eb", borderRadius: 10,
        padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 14,
      }}>
        <input
          type="checkbox"
          checked={reglas[field] as boolean}
          onChange={e => setReglas({ ...reglas, [field]: e.target.checked })}
          style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, cursor: "pointer" }}
        />
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{label}</div>
          <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 2 }}>{desc}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: 13.5 }}>
        Estas reglas controlan qué puede y qué no puede hacer el agente IA al gestionar citas.
      </p>

      <Section title="Ventana de reserva">
        <div style={gridStyle}>
          <Field label="Antelación mínima (horas)" hint="El agente no propone slots con menos de X horas de margen">
            {num("antelacion_min_horas")}
          </Field>
          <Field label="Máx. días adelante" hint="El agente no propone citas con más de X días de anticipación">
            {num("max_dias_adelante")}
          </Field>
          <Field label="Intervalo entre slots (min)" hint="Cada cuántos minutos se ofrece un nuevo hueco disponible">
            {num("intervalo_slots_min")}
          </Field>
          <Field label="Máx. citas simultáneas" hint="Cuántas citas pueden coincidir en el mismo instante en toda la clínica">
            {num("max_citas_simultaneas")}
          </Field>
        </div>
      </Section>

      <Section title="Cancelaciones y cambios">
        <div style={gridStyle}>
          <Field label="Horas mínimas para cancelar" hint="El agente solo cancela si quedan al menos X horas para la cita">
            {num("horas_limite_cancelar")}
          </Field>
          <Field label="Horas mínimas para reprogramar" hint="Igual pero para mover una cita">
            {num("horas_limite_reprogramar")}
          </Field>
        </div>
      </Section>

      <Section title="Permisos del agente">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {bool("permite_mismo_dia", "Aceptar citas para hoy", "El agente puede proponer huecos en el día actual si la antelación mínima se cumple.")}
          {bool("permite_cancelacion_ia", "El agente puede cancelar citas", "Si está desactivado, el agente deriva las cancelaciones a un humano.")}
          {bool("permite_reprogramacion_ia", "El agente puede reprogramar citas", "Si está desactivado, el agente deriva los cambios de fecha a un humano.")}
        </div>
      </Section>

      {notice && (
        <p
          role={notice.type === "error" ? "alert" : "status"}
          style={{
            marginTop: 8,
            fontSize: 13,
            color: notice.type === "error" ? "#b91c1c" : "#166534",
            fontWeight: 500,
          }}
        >
          {notice.text}
        </p>
      )}

      <button onClick={save} disabled={saving} aria-busy={saving} style={{ ...btnPrimaryStyle, marginTop: 8 }}>
        {saving ? "Guardando..." : "Guardar reglas"}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#374151" }}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 4 }}>{label}</label>
      {hint && <p style={{ margin: "0 0 6px", fontSize: 11.5, color: "#9ca3af" }}>{hint}</p>}
      {children}
    </div>
  );
}

const btnPrimaryStyle: React.CSSProperties = {
  padding: "10px 20px", borderRadius: 7, border: "none", background: "#2563eb",
  color: "white", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit",
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid #d1d5db",
  fontSize: 13.5, fontFamily: "inherit", boxSizing: "border-box",
};
const gridStyle: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 24px",
};
