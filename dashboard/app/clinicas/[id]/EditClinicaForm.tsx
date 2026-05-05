"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const DIAS = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];
const DIAS_LABELS: Record<string, string> = {
  lun: "Lunes", mar: "Martes", mie: "Miércoles", jue: "Jueves",
  vie: "Viernes", sab: "Sábado", dom: "Domingo",
};

export default function EditClinicaForm({ clinica, backendUrl }: { clinica: any; backendUrl: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const [nombre, setNombre] = useState(clinica.nombre || "");
  const [telefono, setTelefono] = useState(clinica.telefono || "");
  const [email, setEmail] = useState(clinica.email_contacto || "");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState(clinica.whatsapp_number || "");
  const [promptPersonalizado, setPromptPersonalizado] = useState(clinica.prompt_personalizado || "");

  const initHorarios = () => {
    const base: Record<string, any> = {};
    DIAS.forEach(dia => {
      const h = clinica.horarios?.[dia];
      base[dia] = h ? { ...h, activo: true } : { start: "09:00", end: "20:00", activo: false };
    });
    return base;
  };
  const [horarios, setHorarios] = useState<Record<string, any>>(initHorarios);

  const [servicios, setServicios] = useState<any[]>(
    clinica.servicios?.length > 0
      ? clinica.servicios.map((s: any) => ({ ...s, precio_orientativo: s.precio_orientativo ?? "" }))
      : [{ nombre: "", duracion_min: 60, precio_orientativo: "" }]
  );

  const toggleDia = (dia: string) =>
    setHorarios(h => ({ ...h, [dia]: { ...h[dia], activo: !h[dia].activo } }));

  const updateHorario = (dia: string, field: "start" | "end", value: string) =>
    setHorarios(h => ({ ...h, [dia]: { ...h[dia], [field]: value } }));

  const addServicio = () =>
    setServicios(s => [...s, { nombre: "", duracion_min: 60, precio_orientativo: "" }]);

  const removeServicio = (i: number) =>
    setServicios(s => s.filter((_, idx) => idx !== i));

  const updateServicio = (i: number, field: string, value: any) =>
    setServicios(s => s.map((sv, idx) => idx === i ? { ...sv, [field]: value } : sv));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOk(false);

    const horariosLimpios: Record<string, any> = {};
    Object.entries(horarios).forEach(([dia, h]) => {
      if (h.activo) horariosLimpios[dia] = { start: h.start, end: h.end };
    });

    const serviciosLimpios = servicios
      .filter(s => s.nombre.trim())
      .map(s => ({
        nombre: s.nombre.trim(),
        duracion_min: Number(s.duracion_min),
        ...(s.precio_orientativo !== "" ? { precio_orientativo: Number(s.precio_orientativo) } : {}),
      }));

    try {
      const res = await fetch(`${backendUrl}/admin/clinicas/${clinica.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          telefono: telefono.trim() || null,
          email_contacto: email.trim() || null,
          whatsapp_number: whatsappPhoneId.trim() || null,
          horarios: horariosLimpios,
          servicios: serviciosLimpios,
          prompt_personalizado: promptPersonalizado.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setOk(true);
      router.refresh();
      setTimeout(() => setOpen(false), 1200);
    } catch (e: any) {
      setError(e.message || "Error guardando");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <div style={{ textAlign: "right" }}>
        <button onClick={() => setOpen(true)} style={{
          fontSize: 13, padding: "8px 16px", borderRadius: 6, cursor: "pointer",
          border: "1px solid #d1d5db", background: "white", color: "#374151",
        }}>
          Editar configuración
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: "white", borderRadius: 8, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Editar configuración</h2>
        <button onClick={() => setOpen(false)}
          style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>×</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <Field label="Nombre *">
            <input value={nombre} onChange={e => setNombre(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Teléfono">
            <input value={telefono} onChange={e => setTelefono(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Email de contacto">
            <input value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="WhatsApp Phone Number ID">
            <input value={whatsappPhoneId} onChange={e => setWhatsappPhoneId(e.target.value)}
              placeholder="123456789012345" style={inputStyle} />
          </Field>
        </div>

        <Field label="Servicios" style={{ marginBottom: 16 }}>
          {servicios.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
              <input value={s.nombre} onChange={e => updateServicio(i, "nombre", e.target.value)}
                placeholder="Nombre" style={{ ...inputStyle, flex: 2 }} />
              <input type="number" value={s.duracion_min} min={15} step={15}
                onChange={e => updateServicio(i, "duracion_min", e.target.value)}
                style={{ ...inputStyle, flex: 1 }} />
              <input type="number" value={s.precio_orientativo}
                onChange={e => updateServicio(i, "precio_orientativo", e.target.value)}
                placeholder="€" style={{ ...inputStyle, flex: 1 }} />
              {servicios.length > 1 && (
                <button type="button" onClick={() => removeServicio(i)}
                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 18 }}>×</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addServicio}
            style={{ fontSize: 13, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            + Añadir servicio
          </button>
        </Field>

        <Field label="Horario" style={{ marginBottom: 16 }}>
          {DIAS.map(dia => (
            <div key={dia} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, width: 100, fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={horarios[dia].activo} onChange={() => toggleDia(dia)} />
                {DIAS_LABELS[dia]}
              </label>
              {horarios[dia].activo ? (
                <>
                  <input type="time" value={horarios[dia].start}
                    onChange={e => updateHorario(dia, "start", e.target.value)}
                    style={{ ...inputStyle, width: 100 }} />
                  <span style={{ color: "#9ca3af" }}>—</span>
                  <input type="time" value={horarios[dia].end}
                    onChange={e => updateHorario(dia, "end", e.target.value)}
                    style={{ ...inputStyle, width: 100 }} />
                </>
              ) : (
                <span style={{ fontSize: 12, color: "#9ca3af" }}>Cerrado</span>
              )}
            </div>
          ))}
        </Field>

        <Field label="Instrucciones adicionales para el agente" style={{ marginBottom: 16 }}>
          <textarea value={promptPersonalizado} onChange={e => setPromptPersonalizado(e.target.value)}
            rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>

        {error && (
          <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>
            {error}
          </div>
        )}
        {ok && (
          <div style={{ background: "#dcfce7", color: "#166534", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>
            Guardado correctamente
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={loading} style={{
            background: "#1a1a2e", color: "white", border: "none", borderRadius: 6,
            padding: "9px 20px", fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
          <button type="button" onClick={() => setOpen(false)} style={{
            background: "none", border: "1px solid #d1d5db", borderRadius: 6,
            padding: "9px 20px", fontSize: 14, cursor: "pointer", color: "#374151",
          }}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, style }: { label?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      {label && <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 4 }}>{label}</label>}
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  padding: "7px 10px",
  fontSize: 14,
  boxSizing: "border-box",
};
