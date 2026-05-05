"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const DIAS = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];
const DIAS_LABELS: Record<string, string> = {
  lun: "Lunes", mar: "Martes", mie: "Miércoles", jue: "Jueves",
  vie: "Viernes", sab: "Sábado", dom: "Domingo",
};

const DEFAULT_HORARIOS = {
  lun: { start: "09:00", end: "20:00", activo: true },
  mar: { start: "09:00", end: "20:00", activo: true },
  mie: { start: "09:00", end: "20:00", activo: true },
  jue: { start: "09:00", end: "20:00", activo: true },
  vie: { start: "09:00", end: "20:00", activo: true },
  sab: { start: "10:00", end: "14:00", activo: false },
  dom: { start: "10:00", end: "14:00", activo: false },
};

export default function NuevaClinicaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");
  const [promptPersonalizado, setPromptPersonalizado] = useState("");
  const [horarios, setHorarios] = useState<Record<string, any>>(DEFAULT_HORARIOS);
  const [servicios, setServicios] = useState([
    { nombre: "", duracion_min: 60, precio_orientativo: "" },
  ]);

  const toggleDia = (dia: string) => {
    setHorarios(h => ({ ...h, [dia]: { ...h[dia], activo: !h[dia].activo } }));
  };

  const updateHorario = (dia: string, field: "start" | "end", value: string) => {
    setHorarios(h => ({ ...h, [dia]: { ...h[dia], [field]: value } }));
  };

  const addServicio = () => {
    setServicios(s => [...s, { nombre: "", duracion_min: 60, precio_orientativo: "" }]);
  };

  const removeServicio = (i: number) => {
    setServicios(s => s.filter((_, idx) => idx !== i));
  };

  const updateServicio = (i: number, field: string, value: any) => {
    setServicios(s => s.map((sv, idx) => idx === i ? { ...sv, [field]: value } : sv));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) { setError("El nombre es obligatorio"); return; }

    setLoading(true);
    setError("");

    const horariosLimpios: Record<string, any> = {};
    Object.entries(horarios).forEach(([dia, h]) => {
      if (h.activo) horariosLimpios[dia] = { start: h.start, end: h.end };
    });

    const serviciosLimpios = servicios
      .filter(s => s.nombre.trim())
      .map(s => ({
        nombre: s.nombre.trim(),
        duracion_min: Number(s.duracion_min),
        ...(s.precio_orientativo ? { precio_orientativo: Number(s.precio_orientativo) } : {}),
      }));

    const payload: Record<string, any> = {
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
      email_contacto: email.trim() || null,
      whatsapp_number: whatsappPhoneId.trim() || null,
      horarios: horariosLimpios,
      servicios: serviciosLimpios,
      prompt_personalizado: promptPersonalizado.trim() || null,
    };

    try {
      const res = await fetch(`${BACKEND}/admin/clinicas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const clinica = await res.json();
      router.push(`/clinicas/${clinica.id}`);
    } catch (e: any) {
      setError(e.message || "Error creando el cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, marginBottom: 24 }}>Nuevo cliente</h1>
      <form onSubmit={handleSubmit}>

        <Section title="Datos básicos">
          <Field label="Nombre de la clínica *">
            <input value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Clínica Dental Sonrisa" style={inputStyle} />
          </Field>
          <Row>
            <Field label="Teléfono">
              <input value={telefono} onChange={e => setTelefono(e.target.value)}
                placeholder="+34 612 345 678" style={inputStyle} />
            </Field>
            <Field label="Email de contacto">
              <input value={email} onChange={e => setEmail(e.target.value)}
                placeholder="info@clinica.es" style={inputStyle} />
            </Field>
          </Row>
        </Section>

        <Section title="WhatsApp">
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280" }}>
            Phone Number ID de Meta Cloud API (no el número de teléfono, sino el ID que aparece en el panel de Meta for Developers).
          </p>
          <Field label="Phone Number ID de Meta">
            <input value={whatsappPhoneId} onChange={e => setWhatsappPhoneId(e.target.value)}
              placeholder="123456789012345" style={inputStyle} />
          </Field>
        </Section>

        <Section title="Servicios">
          {servicios.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-end" }}>
              <Field label={i === 0 ? "Nombre del servicio" : undefined} style={{ flex: 2 }}>
                <input value={s.nombre} onChange={e => updateServicio(i, "nombre", e.target.value)}
                  placeholder="Limpieza dental" style={inputStyle} />
              </Field>
              <Field label={i === 0 ? "Duración (min)" : undefined} style={{ flex: 1 }}>
                <input type="number" value={s.duracion_min} min={15} step={15}
                  onChange={e => updateServicio(i, "duracion_min", e.target.value)} style={inputStyle} />
              </Field>
              <Field label={i === 0 ? "Precio orient. (€)" : undefined} style={{ flex: 1 }}>
                <input type="number" value={s.precio_orientativo}
                  onChange={e => updateServicio(i, "precio_orientativo", e.target.value)}
                  placeholder="80" style={inputStyle} />
              </Field>
              {servicios.length > 1 && (
                <button type="button" onClick={() => removeServicio(i)}
                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 18, paddingBottom: 8 }}>
                  ×
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addServicio}
            style={{ fontSize: 13, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            + Añadir servicio
          </button>
        </Section>

        <Section title="Horario de atención">
          {DIAS.map(dia => (
            <div key={dia} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, width: 110, cursor: "pointer", fontSize: 14 }}>
                <input type="checkbox" checked={horarios[dia].activo} onChange={() => toggleDia(dia)} />
                {DIAS_LABELS[dia]}
              </label>
              {horarios[dia].activo ? (
                <>
                  <input type="time" value={horarios[dia].start}
                    onChange={e => updateHorario(dia, "start", e.target.value)}
                    style={{ ...inputStyle, width: 110 }} />
                  <span style={{ color: "#9ca3af" }}>—</span>
                  <input type="time" value={horarios[dia].end}
                    onChange={e => updateHorario(dia, "end", e.target.value)}
                    style={{ ...inputStyle, width: 110 }} />
                </>
              ) : (
                <span style={{ fontSize: 13, color: "#9ca3af" }}>Cerrado</span>
              )}
            </div>
          ))}
        </Section>

        <Section title="Personalización del agente">
          <Field label="Instrucciones adicionales para el agente (opcional)">
            <textarea value={promptPersonalizado} onChange={e => setPromptPersonalizado(e.target.value)}
              rows={4} placeholder="Ej: Esta clínica es especialista en ortodoncia invisible. El precio de Invisalign empieza en 3.500€. No des precios de implantes sin consultar primero..."
              style={{ ...inputStyle, resize: "vertical" }} />
          </Field>
        </Section>

        {error && (
          <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 6, padding: "10px 14px", marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{
          background: "#1a1a2e", color: "white", border: "none", borderRadius: 8,
          padding: "12px 24px", fontSize: 15, cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? "Creando..." : "Crear cliente"}
        </button>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "white", borderRadius: 8, padding: 20, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
      <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "#374151" }}>{title}</h2>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 12 }}>{children}</div>;
}

function Field({ label, children, style }: { label?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: label ? 12 : 0, flex: 1, ...style }}>
      {label && <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 4 }}>{label}</label>}
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 14,
  boxSizing: "border-box",
  outline: "none",
};
