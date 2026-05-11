"use client";
import { useState } from "react";

interface Dialog360Config {
  configured: boolean;
  phone_id: string | null;
  waba_id: string | null;
}

interface Props {
  clinicId: string;
  telefono: string | null;         // voice phone (Telnyx/Retell)
  whatsappNumber: string | null;   // legacy Meta WA
  dialog360?: Dialog360Config;
  compact?: boolean;
}

const PAISES = [
  { code: "ES", label: "ES — España" },
  { code: "PL", label: "PL — Polonia" },
  { code: "DE", label: "DE — Alemania" },
  { code: "FR", label: "FR — Francia" },
  { code: "IT", label: "IT — Italia" },
];

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

export default function CanalesClient({ clinicId, telefono, whatsappNumber, dialog360, compact }: Props) {
  // Voice state
  const [voiceMode, setVoiceMode] = useState<"idle" | "connect-existing" | "search-numbers">("idle");
  const [existingNumber, setExistingNumber] = useState("");
  const [pais, setPais] = useState("ES");
  const [numeros, setNumeros] = useState<string[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceSuccess, setVoiceSuccess] = useState(false);

  // 360dialog state
  const [showWaForm, setShowWaForm] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [waLoading, setWaLoading] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [waSuccess, setWaSuccess] = useState(false);

  const wa360Configured = dialog360?.configured ?? false;

  // ── Voice handlers ──────────────────────────────────────────────────────────

  async function handleDesconectar() {
    setVoiceLoading(true); setVoiceError(null);
    try {
      await fetch("/api/canales/voz", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clinic_id: clinicId }) });
      setVoiceSuccess(true);
      setTimeout(() => window.location.reload(), 800);
    } catch { setVoiceError("Error al desconectar"); } finally { setVoiceLoading(false); }
  }

  async function handleConectar() {
    if (!existingNumber.trim()) { setVoiceError("Introduce un número"); return; }
    setVoiceLoading(true); setVoiceError(null);
    try {
      const res = await fetch("/api/canales/voz", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinic_id: clinicId, telefono: existingNumber.trim(), accion: "conectar" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al conectar");
      setVoiceSuccess(true);
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) { setVoiceError(e.message); } finally { setVoiceLoading(false); }
  }

  async function handleBuscarNumeros() {
    setVoiceLoading(true); setVoiceError(null); setNumeros([]); setSelectedNumber(null);
    try {
      const res = await fetch(`/api/canales/numeros?pais=${pais}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error buscando números");
      setNumeros(data.numeros || []);
      if (!data.numeros?.length) setVoiceError("No se encontraron números para este país");
    } catch (e: any) { setVoiceError(e.message); } finally { setVoiceLoading(false); }
  }

  async function handleComprar() {
    if (!selectedNumber) { setVoiceError("Selecciona un número"); return; }
    setVoiceLoading(true); setVoiceError(null);
    try {
      const res = await fetch("/api/canales/voz", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinic_id: clinicId, telefono: selectedNumber, accion: "comprar" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al comprar número");
      setVoiceSuccess(true);
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) { setVoiceError(e.message); } finally { setVoiceLoading(false); }
  }

  // ── 360dialog handlers ──────────────────────────────────────────────────────

  async function handleConnect360() {
    if (!apiKey.trim() || !phoneId.trim()) { setWaError("API Key y Phone ID son obligatorios"); return; }
    setWaLoading(true); setWaError(null);
    try {
      const res = await fetch(`/api/canales/whatsapp-360`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinic_id: clinicId, dialog360_api_key: apiKey.trim(), dialog360_phone_id: phoneId.trim(), dialog360_waba_id: wabaId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al conectar");
      setWaSuccess(true);
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) { setWaError(e.message); } finally { setWaLoading(false); }
  }

  async function handleDisconnect360() {
    setWaLoading(true);
    try {
      await fetch(`/api/canales/whatsapp-360`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clinic_id: clinicId }) });
      window.location.reload();
    } catch { } finally { setWaLoading(false); }
  }

  return (
    <div style={compact ? {} : { minHeight: "100vh", background: "#f6f7f9", padding: "32px 28px", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      {!compact && (
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>Canales</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>Configura los canales por los que los pacientes contactan con la clínica.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(380px,1fr))", gap: 20 }}>

        {/* ── Voz (Telnyx + Retell) ── */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: "#2563eb" }}>
              <path d="M6.8 2.5a1 1 0 00-1-.2L3.3 3.1C2.5 3.4 2 4.2 2 5c0 7.2 5.8 13 13 13 .8 0 1.6-.5 1.9-1.3l.8-2.5a1 1 0 00-.2-1l-2.5-2a1 1 0 00-1.1-.1l-1.6.9a8.1 8.1 0 01-3.3-3.3l.9-1.6a1 1 0 00-.1-1.1L6.8 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Llamadas (IA de voz)</h2>
          </div>

          {telefono ? (
            <div>
              <span style={badgeGreen}><span style={dot("#16a34a")} />Conectado</span>
              <div style={numberDisplay}>{telefono}</div>
              <p style={{ ...helpText, marginTop: 0 }}>Los pacientes llaman a este número y la IA responde automáticamente.</p>
              {voiceError && <p style={errorStyle}>{voiceError}</p>}
              {voiceSuccess && <p style={successStyle}>Desconectado correctamente</p>}
              <button style={{ ...btnDanger, opacity: voiceLoading ? 0.7 : 1 }} onClick={handleDesconectar} disabled={voiceLoading}>
                {voiceLoading ? "Desconectando..." : "Desconectar número"}
              </button>
            </div>
          ) : (
            <div>
              <span style={badgeGray}>Sin configurar</span>
              <p style={{ ...helpText, marginTop: 12 }}>Conecta un número de teléfono para que los pacientes puedan llamar y la IA los atienda.</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button style={voiceMode === "connect-existing" ? { ...btnSecondary, borderColor: "#2563eb", color: "#2563eb" } : btnSecondary}
                  onClick={() => setVoiceMode("connect-existing")}>Ya tengo número</button>
                <button style={voiceMode === "search-numbers" ? { ...btnSecondary, borderColor: "#2563eb", color: "#2563eb" } : btnSecondary}
                  onClick={() => setVoiceMode("search-numbers")}>Buscar número</button>
              </div>

              {voiceMode === "connect-existing" && (
                <div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input style={{ ...input, flex: 1 }} placeholder="+34 951 000 000" value={existingNumber} onChange={e => setExistingNumber(e.target.value)} />
                    <button style={{ ...btnPrimary, opacity: voiceLoading ? 0.7 : 1 }} onClick={handleConectar} disabled={voiceLoading}>
                      {voiceLoading ? "Conectando..." : "Conectar"}
                    </button>
                  </div>
                </div>
              )}

              {voiceMode === "search-numbers" && (
                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <select style={{ ...input, flex: 1 }} value={pais} onChange={e => { setPais(e.target.value); setNumeros([]); setSelectedNumber(null); }}>
                      {PAISES.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
                    </select>
                    <button style={{ ...btnPrimary, opacity: voiceLoading ? 0.7 : 1, whiteSpace: "nowrap" }} onClick={handleBuscarNumeros} disabled={voiceLoading}>
                      {voiceLoading && !numeros.length ? "Buscando..." : "Buscar"}
                    </button>
                  </div>
                  {numeros.length > 0 && (
                    <div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto", marginBottom: 12 }}>
                        {numeros.map(n => (
                          <div key={n} onClick={() => setSelectedNumber(n)}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: `${selectedNumber === n ? "2px solid #2563eb" : "1px solid #e5e7eb"}`, borderRadius: 8, cursor: "pointer", background: selectedNumber === n ? "#eff6ff" : "white" }}>
                            <input type="radio" checked={selectedNumber === n} onChange={() => setSelectedNumber(n)} style={{ accentColor: "#2563eb" }} />
                            <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 14 }}>{n}</span>
                          </div>
                        ))}
                      </div>
                      <button style={{ ...btnPrimary, opacity: (voiceLoading || !selectedNumber) ? 0.7 : 1 }} onClick={handleComprar} disabled={voiceLoading || !selectedNumber}>
                        {voiceLoading ? "Comprando..." : "Comprar y conectar"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {voiceError && <p style={errorStyle}>{voiceError}</p>}
              {voiceSuccess && <p style={successStyle}>Número conectado correctamente</p>}
            </div>
          )}
        </div>

        {/* ── WhatsApp (360dialog) ── */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8.5" fill="#25D366" />
              <path d="M13.8 12.5c-.2-.1-1.2-.6-1.4-.7-.2-.1-.3-.1-.5.1-.1.2-.5.7-.6.8-.1.1-.2.1-.4 0-.2-.1-.8-.3-1.6-1-.6-.5-1-1.1-1.1-1.3-.1-.2 0-.3.1-.4l.3-.4c.1-.1.1-.2.2-.3 0-.1 0-.2-.1-.3-.1-.1-.5-1.2-.7-1.6-.2-.4-.3-.4-.5-.4h-.4c-.1 0-.4.1-.6.3-.2.2-.7.7-.7 1.7s.7 2 .8 2.1c.1.1 1.4 2.1 3.4 2.9.5.2.8.3 1.1.4.5.1.9.1 1.3.1.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1z" fill="white" />
            </svg>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>WhatsApp Business</h2>
          </div>

          {wa360Configured ? (
            <div>
              <span style={badgeGreen}><span style={dot("#16a34a")} />Conectado</span>
              {dialog360?.phone_id && <div style={numberDisplay}>{dialog360.phone_id}</div>}
              <p style={{ ...helpText, marginTop: 0 }}>Los pacientes pueden escribir por WhatsApp y la IA responde automáticamente.</p>
              {waError && <p style={errorStyle}>{waError}</p>}
              <button style={{ ...btnDanger, opacity: waLoading ? 0.7 : 1 }} onClick={handleDisconnect360} disabled={waLoading}>
                {waLoading ? "Desconectando..." : "Desconectar WhatsApp"}
              </button>
            </div>
          ) : (
            <div>
              <span style={badgeGray}>Sin configurar</span>
              <p style={{ ...helpText, marginTop: 12 }}>
                Usa <strong>360dialog</strong> para conectar tu número de WhatsApp Business.
                Nosotros nos encargamos de la configuración técnica — solo necesitas las credenciales.
              </p>

              {!showWaForm ? (
                <div>
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px", marginBottom: 14 }}>
                    <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#374151" }}>Pasos para conectar:</p>
                    <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#6b7280", lineHeight: 1.8 }}>
                      <li>Crea una cuenta en <strong>360dialog.com</strong></li>
                      <li>Conecta tu número de WhatsApp Business</li>
                      <li>Copia tu API Key y Phone Number ID</li>
                      <li>Configura el webhook: <code style={{ background: "#e5e7eb", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>/webhook/whatsapp/360dialog</code></li>
                    </ol>
                  </div>
                  <button style={btnPrimary} onClick={() => setShowWaForm(true)}>Tengo las credenciales</button>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>API Key <span style={{ color: "#dc2626" }}>*</span></label>
                      <input style={input} placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxx" value={apiKey} onChange={e => setApiKey(e.target.value)} type="password" />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Phone Number ID <span style={{ color: "#dc2626" }}>*</span></label>
                      <input style={input} placeholder="123456789012345" value={phoneId} onChange={e => setPhoneId(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>WABA ID <span style={{ color: "#9ca3af" }}>(opcional)</span></label>
                      <input style={input} placeholder="987654321098765" value={wabaId} onChange={e => setWabaId(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{ ...btnPrimary, opacity: waLoading ? 0.7 : 1 }} onClick={handleConnect360} disabled={waLoading}>
                      {waLoading ? "Conectando..." : "Conectar"}
                    </button>
                    <button style={btnSecondary} onClick={() => setShowWaForm(false)}>Cancelar</button>
                  </div>
                  {waError && <p style={errorStyle}>{waError}</p>}
                  {waSuccess && <p style={successStyle}>WhatsApp conectado correctamente</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
