"use client";
import { useState } from "react";

interface Props {
  clinicId: string;
  telefono: string | null;
  whatsappNumber: string | null;
}

const PAISES = [
  { code: "ES", label: "ES — España" },
  { code: "PL", label: "PL — Polonia" },
  { code: "DE", label: "DE — Alemania" },
  { code: "FR", label: "FR — Francia" },
  { code: "IT", label: "IT — Italia" },
];

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f6f7f9",
    padding: "32px 28px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  } as React.CSSProperties,
  header: {
    marginBottom: 28,
  } as React.CSSProperties,
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
    letterSpacing: "-0.02em",
  } as React.CSSProperties,
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  } as React.CSSProperties,
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
    gap: 20,
  } as React.CSSProperties,
  card: {
    background: "white",
    borderRadius: 12,
    padding: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    border: "1px solid #e5e7eb",
  } as React.CSSProperties,
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  } as React.CSSProperties,
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  } as React.CSSProperties,
  badgeGreen: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    background: "#dcfce7",
    color: "#166534",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 20,
    padding: "3px 10px",
  } as React.CSSProperties,
  badgeGray: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    background: "#f3f4f6",
    color: "#6b7280",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 20,
    padding: "3px 10px",
  } as React.CSSProperties,
  numberDisplay: {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
    letterSpacing: "0.02em",
    margin: "10px 0",
    fontVariantNumeric: "tabular-nums",
  } as React.CSSProperties,
  btnPrimary: {
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "9px 18px",
    cursor: "pointer",
    fontSize: 13.5,
    fontWeight: 600,
    fontFamily: "system-ui, -apple-system, sans-serif",
  } as React.CSSProperties,
  btnDanger: {
    background: "white",
    color: "#dc2626",
    border: "1px solid #fca5a5",
    borderRadius: 8,
    padding: "9px 18px",
    cursor: "pointer",
    fontSize: 13.5,
    fontWeight: 600,
    fontFamily: "system-ui, -apple-system, sans-serif",
  } as React.CSSProperties,
  btnSecondary: {
    background: "white",
    color: "#374151",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "9px 18px",
    cursor: "pointer",
    fontSize: 13.5,
    fontWeight: 600,
    fontFamily: "system-ui, -apple-system, sans-serif",
  } as React.CSSProperties,
  btnDisabled: {
    background: "#f3f4f6",
    color: "#9ca3af",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "9px 18px",
    cursor: "not-allowed",
    fontSize: 13.5,
    fontWeight: 600,
    fontFamily: "system-ui, -apple-system, sans-serif",
  } as React.CSSProperties,
  input: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 14,
    width: "100%",
    outline: "none",
    fontFamily: "system-ui, -apple-system, sans-serif",
    boxSizing: "border-box",
  } as React.CSSProperties,
  select: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 14,
    width: "100%",
    outline: "none",
    background: "white",
    fontFamily: "system-ui, -apple-system, sans-serif",
    boxSizing: "border-box",
  } as React.CSSProperties,
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    marginTop: 8,
  } as React.CSSProperties,
  successText: {
    color: "#166534",
    fontSize: 13,
    marginTop: 8,
  } as React.CSSProperties,
  divider: {
    borderTop: "1px solid #f3f4f6",
    margin: "16px 0",
  } as React.CSSProperties,
  optionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 8,
  } as React.CSSProperties,
  helpText: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.5,
    marginBottom: 16,
  } as React.CSSProperties,
  numeroItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "system-ui, -apple-system, sans-serif",
  } as React.CSSProperties,
  numeroItemSelected: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    border: "2px solid #2563eb",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    background: "#eff6ff",
    fontFamily: "system-ui, -apple-system, sans-serif",
  } as React.CSSProperties,
  row: {
    display: "flex",
    gap: 10,
    alignItems: "flex-end",
  } as React.CSSProperties,
  modeSelector: {
    display: "flex",
    gap: 8,
    marginBottom: 16,
  } as React.CSSProperties,
  modeBtnActive: {
    padding: "7px 14px",
    borderRadius: 8,
    border: "2px solid #2563eb",
    background: "#eff6ff",
    color: "#2563eb",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "system-ui, -apple-system, sans-serif",
  } as React.CSSProperties,
  modeBtnInactive: {
    padding: "7px 14px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "white",
    color: "#6b7280",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "system-ui, -apple-system, sans-serif",
  } as React.CSSProperties,
};

export default function CanalesClient({ clinicId, telefono, whatsappNumber }: Props) {
  // Voice channel state
  const [mode, setMode] = useState<"idle" | "connect-existing" | "search-numbers">("idle");
  const [existingNumber, setExistingNumber] = useState("");
  const [pais, setPais] = useState("ES");
  const [numeros, setNumeros] = useState<string[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const clearState = () => {
    setError(null);
    setSuccess(false);
  };

  async function handleDesconectar() {
    clearState();
    setLoading(true);
    try {
      const res = await fetch("/api/canales/voz", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinic_id: clinicId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al desconectar");
      setSuccess(true);
      setTimeout(() => window.location.reload(), 800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleConectar() {
    clearState();
    if (!existingNumber.trim()) {
      setError("Introduce un número de teléfono");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/canales/voz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinic_id: clinicId, telefono: existingNumber.trim(), accion: "conectar" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al conectar");
      setSuccess(true);
      setTimeout(() => window.location.reload(), 800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleBuscarNumeros() {
    clearState();
    setNumeros([]);
    setSelectedNumber(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/canales/numeros?pais=${pais}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al buscar números");
      setNumeros(data.numeros || []);
      if ((data.numeros || []).length === 0) setError("No se encontraron números disponibles para este país");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function handleComprar() {
    clearState();
    if (!selectedNumber) {
      setError("Selecciona un número");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/canales/voz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinic_id: clinicId, telefono: selectedNumber, accion: "comprar" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al comprar número");
      setSuccess(true);
      setTimeout(() => window.location.reload(), 800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Canales de comunicación</h1>
        <p style={styles.subtitle}>Configura los canales por los que los pacientes contactarán con la clínica</p>
      </div>

      <div style={styles.grid}>
        {/* ── Voz Card ── */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: "#2563eb", flexShrink: 0 }}>
              <path d="M6.8 2.5a1 1 0 00-1-.2L3.3 3.1C2.5 3.4 2 4.2 2 5c0 7.2 5.8 13 13 13 .8 0 1.6-.5 1.9-1.3l.8-2.5a1 1 0 00-.2-1l-2.5-2a1 1 0 00-1.1-.1l-1.6.9a8.1 8.1 0 01-3.3-3.3l.9-1.6a1 1 0 00-.1-1.1L6.8 2.5z"
                stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <h2 style={styles.cardTitle}>Voz (Teléfono)</h2>
          </div>

          {telefono ? (
            /* ─ Connected ─ */
            <div>
              <span style={styles.badgeGreen}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
                Conectado
              </span>
              <div style={styles.numberDisplay}>{telefono}</div>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, marginTop: 0 }}>
                Este número está configurado para recibir llamadas de pacientes.
              </p>
              {error && <p style={styles.errorText}>{error}</p>}
              {success && <p style={styles.successText}>Desconectado correctamente</p>}
              <button
                style={{ ...styles.btnDanger, opacity: loading ? 0.7 : 1 }}
                onClick={handleDesconectar}
                disabled={loading}
              >
                {loading ? "Desconectando..." : "Desconectar número"}
              </button>
            </div>
          ) : (
            /* ─ Not configured ─ */
            <div>
              <span style={styles.badgeGray}>Sin configurar</span>
              <p style={{ ...styles.helpText, marginTop: 12 }}>
                Conecta un número de teléfono para que los pacientes puedan llamar a la recepcionista IA.
              </p>

              {/* Mode selector */}
              <div style={styles.modeSelector}>
                <button
                  style={mode === "connect-existing" ? styles.modeBtnActive : styles.modeBtnInactive}
                  onClick={() => { setMode("connect-existing"); clearState(); }}
                >
                  Ya tengo un número
                </button>
                <button
                  style={mode === "search-numbers" ? styles.modeBtnActive : styles.modeBtnInactive}
                  onClick={() => { setMode("search-numbers"); clearState(); }}
                >
                  Quiero buscar un número
                </button>
              </div>

              {/* Option A: connect existing */}
              {mode === "connect-existing" && (
                <div>
                  <div style={styles.optionLabel}>Introduce tu número (con prefijo internacional)</div>
                  <div style={styles.row}>
                    <input
                      style={{ ...styles.input, flex: 1 }}
                      placeholder="+34 951 000 000"
                      value={existingNumber}
                      onChange={e => setExistingNumber(e.target.value)}
                    />
                    <button
                      style={{ ...styles.btnPrimary, opacity: loading ? 0.7 : 1, whiteSpace: "nowrap" }}
                      onClick={handleConectar}
                      disabled={loading}
                    >
                      {loading ? "Conectando..." : "Conectar"}
                    </button>
                  </div>
                  {error && <p style={styles.errorText}>{error}</p>}
                  {success && <p style={styles.successText}>Número conectado correctamente</p>}
                </div>
              )}

              {/* Option B: search numbers */}
              {mode === "search-numbers" && (
                <div>
                  <div style={styles.optionLabel}>País</div>
                  <div style={{ ...styles.row, marginBottom: 12 }}>
                    <select
                      style={{ ...styles.select, flex: 1 }}
                      value={pais}
                      onChange={e => { setPais(e.target.value); setNumeros([]); setSelectedNumber(null); }}
                    >
                      {PAISES.map(p => (
                        <option key={p.code} value={p.code}>{p.label}</option>
                      ))}
                    </select>
                    <button
                      style={{ ...styles.btnPrimary, opacity: loading ? 0.7 : 1, whiteSpace: "nowrap" }}
                      onClick={handleBuscarNumeros}
                      disabled={loading}
                    >
                      {loading && numeros.length === 0 ? "Buscando..." : "Buscar números disponibles"}
                    </button>
                  </div>

                  {numeros.length > 0 && (
                    <div>
                      <div style={{ ...styles.optionLabel, marginBottom: 8 }}>Selecciona un número</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto", marginBottom: 14 }}>
                        {numeros.map(n => (
                          <div
                            key={n}
                            style={selectedNumber === n ? styles.numeroItemSelected : styles.numeroItem}
                            onClick={() => setSelectedNumber(n)}
                          >
                            <input
                              type="radio"
                              checked={selectedNumber === n}
                              onChange={() => setSelectedNumber(n)}
                              style={{ cursor: "pointer", accentColor: "#2563eb" }}
                            />
                            <span style={{ fontVariantNumeric: "tabular-nums" }}>{n}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        style={{ ...styles.btnPrimary, opacity: (loading || !selectedNumber) ? 0.7 : 1 }}
                        onClick={handleComprar}
                        disabled={loading || !selectedNumber}
                      >
                        {loading ? "Comprando y conectando..." : "Comprar y conectar"}
                      </button>
                    </div>
                  )}

                  {error && <p style={styles.errorText}>{error}</p>}
                  {success && <p style={styles.successText}>Número comprado y conectado correctamente</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── WhatsApp Card ── */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="10" cy="10" r="8.5" fill="#25D366" />
              <path d="M13.8 12.5c-.2-.1-1.2-.6-1.4-.7-.2-.1-.3-.1-.5.1-.1.2-.5.7-.6.8-.1.1-.2.1-.4 0-.2-.1-.8-.3-1.6-1-.6-.5-1-1.1-1.1-1.3-.1-.2 0-.3.1-.4l.3-.4c.1-.1.1-.2.2-.3 0-.1 0-.2-.1-.3-.1-.1-.5-1.2-.7-1.6-.2-.4-.3-.4-.5-.4h-.4c-.1 0-.4.1-.6.3-.2.2-.7.7-.7 1.7s.7 2 .8 2.1c.1.1 1.4 2.1 3.4 2.9.5.2.8.3 1.1.4.5.1.9.1 1.3.1.4-.1 1.2-.5 1.4-1 .2-.5.2-.9.1-1z" fill="white" />
            </svg>
            <h2 style={styles.cardTitle}>WhatsApp Business</h2>
          </div>

          {whatsappNumber ? (
            <div>
              <span style={styles.badgeGreen}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
                Conectado
              </span>
              <div style={styles.numberDisplay}>{whatsappNumber}</div>
              <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                Los mensajes de pacientes llegan por este número de WhatsApp.
              </p>
            </div>
          ) : (
            <div>
              <span style={styles.badgeGray}>Sin configurar</span>
              <p style={{ ...styles.helpText, marginTop: 12 }}>
                Conecta tu número de WhatsApp Business para recibir mensajes de pacientes directamente en la recepcionista IA.
              </p>
              <button style={styles.btnDisabled} disabled>
                Próximamente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
