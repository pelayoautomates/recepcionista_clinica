"use client";
import { useState, useEffect } from "react";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

interface Props {
  clinicId: string;
  telefonoClinica: string | null;
  telefonoIa: string | null;
  routingMode: "si_no_contestan" | "fuera_horario" | "siempre";
  desvioInicial: Desvio | null;
  twilioNumber: string | null;
  twilioConfigured: boolean;
  smsActivo: boolean;
  metaConfigured: boolean;
  metaPhoneNumber: string | null;
  compact?: boolean;
}

type Desvio = {
  activar: string;
  desactivar: string;
  explicacion: string;
  segundos: number | null;
};


const card: React.CSSProperties = {
  background: "white", borderRadius: 12, padding: 24,
  border: "1px solid #e5e7eb",
};
const badgeGreen: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  background: "#dcfce7", color: "#166534", fontSize: 12, fontWeight: 600,
  borderRadius: 20, padding: "3px 10px",
};
const badgeGray: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  background: "#f3f4f6", color: "#6b7280", fontSize: 12, fontWeight: 600,
  borderRadius: 20, padding: "3px 10px",
};
const badgeBlue: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 600,
  borderRadius: 20, padding: "3px 10px",
};
const btnPrimary: React.CSSProperties = {
  background: "#2563eb", color: "white", border: "none", borderRadius: 8,
  padding: "9px 18px", cursor: "pointer", fontSize: 13.5, fontWeight: 600, fontFamily: "inherit",
};
const btnDanger: React.CSSProperties = {
  background: "white", color: "#dc2626", border: "1px solid #fca5a5",
  borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13.5, fontWeight: 600, fontFamily: "inherit",
};
const btnSecondary: React.CSSProperties = {
  background: "white", color: "#374151", border: "1px solid #e5e7eb",
  borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13.5, fontWeight: 600, fontFamily: "inherit",
};
const input: React.CSSProperties = {
  border: "1px solid #e5e7eb", borderRadius: 8, padding: "9px 12px", fontSize: 14,
  width: "100%", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};
const helpText: React.CSSProperties = { fontSize: 13, color: "#6b7280", lineHeight: 1.5, marginBottom: 12 };
const errorStyle: React.CSSProperties = { color: "#dc2626", fontSize: 13, marginTop: 8 };
const successStyle: React.CSSProperties = { color: "#166534", fontSize: 13, marginTop: 8 };
const numberDisplay: React.CSSProperties = {
  fontSize: 18, fontWeight: 700, color: "#111827", letterSpacing: "0.02em", margin: "10px 0",
};
const dot = (color: string): React.CSSProperties => ({
  width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block",
});

export default function CanalesClient({ clinicId, telefonoClinica, telefonoIa, routingMode, desvioInicial, twilioNumber, twilioConfigured, smsActivo, metaConfigured, metaPhoneNumber, compact }: Props) {
  // WhatsApp Meta state
  const [waLoading, setWaLoading] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [waConnected, setWaConnected] = useState(metaConfigured);
  const [waPhone, setWaPhone] = useState<string | null>(metaPhoneNumber);

  // Cargar Facebook SDK
  useEffect(() => {
    if (document.getElementById("facebook-jssdk")) return;
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v21.0",
      });
    };
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/es_ES/sdk.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  function handleConectarWhatsApp() {
    if (!window.FB) { setWaError("Facebook SDK no cargado, recarga la página"); return; }
    setWaLoading(true); setWaError(null);
    window.FB.login(
      function (response: any) {
        if (!response.authResponse?.code) {
          setWaLoading(false);
          if (response.status !== "connected") setWaError("Conexión cancelada o no autorizada");
          return;
        }
        const { code } = response.authResponse;
        const extras = response.authResponse.extras || {};
        const sessionInfo = extras.setup || {};
        fetch("/api/canales/whatsapp-meta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clinic_id: clinicId,
            code,
            waba_id: sessionInfo.waba_id || null,
            phone_number_id: sessionInfo.phone_number_id || null,
          }),
        })
          .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
          .then(({ ok, data }) => {
            if (!ok) throw new Error(data.detail || "Error conectando WhatsApp");
            setWaConnected(true);
            setWaPhone(data.phone_number || null);
          })
          .catch((e: any) => setWaError(e.message))
          .finally(() => setWaLoading(false));
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_CONFIGURATION_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      }
    );
  }

  async function handleDesconectarWhatsApp() {
    setWaLoading(true); setWaError(null);
    try {
      const res = await fetch("/api/canales/whatsapp-meta", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinic_id: clinicId }),
      });
      if (!res.ok) throw new Error("Error desconectando");
      setWaConnected(false); setWaPhone(null);
    } catch (e: any) {
      setWaError(e.message);
    } finally {
      setWaLoading(false);
    }
  }

  // Voice state
  const [clinicNumber, setClinicNumber] = useState(telefonoClinica || "");
  const [selectedRoutingMode, setSelectedRoutingMode] = useState(routingMode || "si_no_contestan");
  const [desvio, setDesvio] = useState<Desvio | null>(desvioInicial);
  const [copied, setCopied] = useState<string | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceSuccess, setVoiceSuccess] = useState<string | null>(null);

  //  Voice handlers 

  async function handleDesconectar() {
    const confirmed = window.confirm(
      "Antes de desconectar, marca ##002# desde la linea de la clinica para cancelar el desvio. Confirma solo cuando el operador haya aceptado el codigo."
    );
    if (!confirmed) return;
    setVoiceLoading(true); setVoiceError(null); setVoiceSuccess(null);
    try {
      const res = await fetch("/api/canales/voz", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinic_id: clinicId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Error al desconectar");
      setVoiceSuccess("Desconectado correctamente.");
      setTimeout(() => window.location.reload(), 800);
    } catch { setVoiceError("Error al desconectar"); } finally { setVoiceLoading(false); }
  }

  async function handleActivar() {
    if (!clinicNumber.trim()) { setVoiceError("Introduce el numero habitual de la clinica"); return; }
    setVoiceLoading(true); setVoiceError(null); setVoiceSuccess(null);
    try {
      const res = await fetch("/api/canales/voz", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinic_id: clinicId,
          telefono_clinica: clinicNumber.trim(),
          routing_mode: selectedRoutingMode,
          segundos_desvio: 20,
          accion: "activar",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "No se pudo preparar el desvio");
      setDesvio(data.desvio);
      setVoiceSuccess("Canal preparado. Marca el codigo en el telefono de la clinica y haz una llamada de prueba.");
    } catch (e: any) { setVoiceError(e.message); } finally { setVoiceLoading(false); }
  }

  async function copyCode(code: string, label: string) {
    await navigator.clipboard.writeText(code);
    setCopied(label);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div style={compact ? {} : { minHeight: "100vh", background: "#f6f7f9", padding: "32px 28px", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      {!compact && (
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>Canales</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>Configura los canales por los que los pacientes contactan con la clinica.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(380px,1fr))", gap: 20 }}>

        {/*  Voz (Telnyx + Retell)  */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: "#2563eb" }}>
              <path d="M6.8 2.5a1 1 0 00-1-.2L3.3 3.1C2.5 3.4 2 4.2 2 5c0 7.2 5.8 13 13 13 .8 0 1.6-.5 1.9-1.3l.8-2.5a1 1 0 00-.2-1l-2.5-2a1 1 0 00-1.1-.1l-1.6.9a8.1 8.1 0 01-3.3-3.3l.9-1.6a1 1 0 00-.1-1.1L6.8 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Llamadas (IA de voz)</h2>
          </div>

          <div>
            <span style={telefonoIa ? badgeGreen : badgeBlue}>
              <span style={dot(telefonoIa ? "#16a34a" : "#2563eb")} />
              {telefonoIa ? "Numero tecnico preparado" : "Activacion guiada"}
            </span>
            <h3 style={{ margin: "14px 0 6px", fontSize: 20, letterSpacing: "-0.02em", color: "#111827" }}>
              Conserva el numero que ya conocen tus pacientes
            </h3>
            <p style={{ ...helpText, marginTop: 0 }}>
              Configuramos un desvio. Tu telefono suena primero y Atiende360 entra solo segun la regla que elijas.
            </p>

            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
              Numero habitual de la clinica
            </label>
            <input
              style={input}
              inputMode="tel"
              autoComplete="tel"
              placeholder="+34 912 345 678"
              value={clinicNumber}
              onChange={e => setClinicNumber(e.target.value)}
            />

            <fieldset style={{ border: 0, padding: 0, margin: "16px 0" }}>
              <legend style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Cuando responde la IA</legend>
              {[
                ["si_no_contestan", "Si nadie contesta", "Recomendado: la clinica mantiene la primera oportunidad de responder."],
                ["fuera_horario", "Fuera de horario", "Activa el desvio al cerrar y desactivalo al abrir."],
                ["siempre", "Siempre", "Todas las llamadas pasan directamente a Atiende360."],
              ].map(([value, title, description]) => (
                <label key={value} style={{
                  display: "grid", gridTemplateColumns: "18px 1fr", gap: 9, alignItems: "start",
                  padding: "10px 12px", marginBottom: 7, borderRadius: 9, cursor: "pointer",
                  border: selectedRoutingMode === value ? "1px solid #2563eb" : "1px solid #e5e7eb",
                  background: selectedRoutingMode === value ? "#eff6ff" : "#fff",
                }}>
                  <input type="radio" name="routing-mode" value={value} checked={selectedRoutingMode === value}
                    onChange={() => { setSelectedRoutingMode(value as typeof selectedRoutingMode); setDesvio(null); }}
                    style={{ marginTop: 2, accentColor: "#2563eb" }} />
                  <span>
                    <strong style={{ display: "block", fontSize: 13, color: "#111827" }}>{title}</strong>
                    <small style={{ color: "#6b7280", lineHeight: 1.4 }}>{description}</small>
                  </span>
                </label>
              ))}
            </fieldset>

            <button style={{ ...btnPrimary, width: "100%", opacity: voiceLoading ? 0.7 : 1 }} onClick={handleActivar} disabled={voiceLoading}>
              {voiceLoading ? "Preparando desvio..." : telefonoIa ? "Actualizar instrucciones" : "Preparar activacion"}
            </button>

            {desvio && (
              <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: "#0f172a", color: "white" }}>
                <p style={{ margin: "0 0 5px", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#93c5fd" }}>Paso final en el telefono</p>
                <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.5, color: "#cbd5e1" }}>{desvio.explicacion}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#020617", borderRadius: 9, padding: "10px 12px" }}>
                  <code style={{ fontSize: 17, fontWeight: 800, letterSpacing: "0.04em", color: "#f8fafc" }}>{desvio.activar}</code>
                  <button type="button" onClick={() => copyCode(desvio.activar, "activar")} style={{ ...btnSecondary, padding: "6px 10px", background: "#1e293b", borderColor: "#334155", color: "white" }}>
                    {copied === "activar" ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <ol style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 12.5, lineHeight: 1.65, color: "#cbd5e1" }}>
                  <li>Marca el codigo desde la linea habitual de la clinica.</li>
                  <li>Espera la confirmacion del operador.</li>
                  <li>Llama desde otro telefono y comprueba el saludo de IA.</li>
                </ol>
                <p style={{ margin: "10px 0 0", fontSize: 11.5, color: "#94a3b8" }}>
                  Si tu operador no acepta el codigo, pide que desvien las llamadas a {telefonoIa || "el numero tecnico asignado"}.
                </p>
              </div>
            )}

            {voiceError && <p role="alert" style={errorStyle}>{voiceError}</p>}
            {voiceSuccess && <p role="status" style={successStyle}>{voiceSuccess}</p>}
            {telefonoIa && (
              <div style={{ marginTop: 12 }}>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6b7280" }}>
                  Para apagar el desvio marca <strong>##002#</strong> desde la linea de la clinica antes de desconectar el canal.
                </p>
                <button style={{ ...btnDanger, opacity: voiceLoading ? 0.7 : 1 }} onClick={handleDesconectar} disabled={voiceLoading}>
                  {voiceLoading ? "Desconectando..." : "Ya he cancelado el desvio; desconectar"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/*  SMS (Telnyx)  */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="4" width="16" height="12" rx="2" stroke="#7c3aed" strokeWidth="1.5" />
              <path d="M2 7l8 5 8-5" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>SMS (recordatorios)</h2>
          </div>

          {smsActivo ? (
            <div>
              <span style={badgeGreen}><span style={dot("#16a34a")} />Activo</span>
              <p style={{ ...helpText, marginTop: 10 }}>
                Los recordatorios de cita (24h y 1h antes) y el seguimiento de leads se envian
                automaticamente por SMS via Telnyx.
              </p>
              <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#5b21b6" }}>
                Canal compartido con voz - mismo numero Telnyx, sin coste adicional de setup.
              </div>
            </div>
          ) : (
            <div>
              <span style={badgeGray}>Pendiente configurar</span>
              <p style={{ ...helpText, marginTop: 10 }}>
                SMS automaticos para recordatorios de cita y seguimiento de leads.
                Requiere anadir <strong>TELNYX_SMS_NUMBER</strong> en Railway.
              </p>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#374151" }}>
                Coste aprox: <strong>~$0.04-0.08 / SMS</strong> segun pais.
                Sin setup adicional - usa tu cuenta Telnyx existente.
              </div>
            </div>
          )}
        </div>

        {/*  WhatsApp (Meta Embedded Signup)  */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8.5" fill="#25D366" />
              <path d="M13.8 12.5c-.2-.1-1.2-.6-1.4-.7-.2-.1-.3-.1-.5.1-.1.2-.5.7-.6.8-.1.1-.2.1-.4 0-.2-.1-.8-.3-1.6-1-.6-.5-1-1.1-1.1-1.3-.1-.2 0-.3.1-.4l.3-.4c.1-.1.1-.2.2-.3 0-.1 0-.2-.1-.3-.1-.1-.5-1.2-.7-1.6-.2-.4-.3-.4-.5-.4h-.4c-.1 0-.4.1-.6.3-.2.2-.7.7-.7 1.7s.7 2 .8 2.1c.1.1 1.4 2.1 3.4 2.9.5.2.8.3 1.1.4.5.1.9.1 1.3.1.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1z" fill="white" />
            </svg>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>WhatsApp Business</h2>
          </div>

          {waConnected ? (
            <div>
              <span style={badgeGreen}><span style={dot("#16a34a")} />Conectado</span>
              {waPhone && <div style={numberDisplay}>{waPhone}</div>}
              <p style={{ ...helpText, marginTop: 0 }}>
                Los pacientes pueden escribir a este numero y la IA responde automaticamente.
              </p>
              {waError && <p style={errorStyle}>{waError}</p>}
              <button
                style={{ ...btnDanger, opacity: waLoading ? 0.7 : 1 }}
                onClick={handleDesconectarWhatsApp}
                disabled={waLoading}
              >
                {waLoading ? "Desconectando..." : "Desconectar WhatsApp"}
              </button>
            </div>
          ) : (
            <div>
              <span style={badgeGray}>Sin configurar</span>
              <p style={{ ...helpText, marginTop: 12 }}>
                Conecta tu numero de WhatsApp Business en segundos. Funciona con numeros nuevos
                o con el que ya tienes.
              </p>
              {waError && <p style={errorStyle}>{waError}</p>}
              <button
                style={{ ...btnPrimary, opacity: waLoading ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8 }}
                onClick={handleConectarWhatsApp}
                disabled={waLoading}
              >
                {waLoading ? "Conectando..." : "Conectar WhatsApp"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
