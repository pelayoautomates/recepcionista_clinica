"use client";
import { useState, useEffect } from "react";

export default function InvitacionButton({ clinicId }: { clinicId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenerando, setRegenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API = `/api/clinicas/${clinicId}/invitacion`;

  useEffect(() => {
    setError(null);
    fetch(API)
      .then(async r => {
        const data = await r.json();
        if (!r.ok) {
          setError(`Error ${r.status}: ${data.detail || JSON.stringify(data)}`);
          return;
        }
        if (data.token) {
          setToken(data.token);
        } else {
          const res2 = await fetch(API, { method: "POST" });
          const data2 = await res2.json();
          if (!res2.ok) {
            setError(`Error creando token ${res2.status}: ${data2.detail || JSON.stringify(data2)}`);
            return;
          }
          setToken(data2.token);
        }
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [clinicId]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const link = token && siteUrl ? `${siteUrl}/login?token=${token}` : "";

  const copiar = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerar = async () => {
    if (!confirm("¿Generar un nuevo link? El link actual dejará de funcionar.")) return;
    setRegenerando(true);
    setError(null);
    try {
      await fetch(API, { method: "DELETE" });
      const res = await fetch(API, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(`Error regenerando ${res.status}: ${data.detail || JSON.stringify(data)}`);
        return;
      }
      setToken(data.token);
    } catch (e) {
      setError(String(e));
    } finally {
      setRegenerando(false);
    }
  };

  if (loading) {
    return <div style={{ fontSize: 13, color: "#9ca3af" }}>Cargando link…</div>;
  }

  if (error) {
    return (
      <div>
        <div style={{
          background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
          padding: "10px 14px", fontSize: 12, color: "#dc2626", marginBottom: 8,
          fontFamily: "monospace", wordBreak: "break-all",
        }}>
          {error}
        </div>
        <button onClick={() => { setError(null); setLoading(true); setToken(null); }} style={{
          fontSize: 12, padding: "5px 12px", borderRadius: 6,
          border: "1px solid #e5e7eb", background: "white", color: "#374151",
          cursor: "pointer", fontFamily: "inherit",
        }}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{
          fontSize: 11, background: "#f0fdf4", color: "#166534",
          border: "1px solid #86efac", borderRadius: 8, padding: "2px 8px", fontWeight: 600,
        }}>
          Permanente
        </span>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>
          Este link no expira — la clínica puede guardarlo como favorito
        </span>
      </div>

      <div style={{
        background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8,
        padding: "10px 12px", fontSize: 12, fontFamily: "monospace",
        wordBreak: "break-all", marginBottom: 10, color: "#374151",
        userSelect: "all",
      }}>
        {link || "—"}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={copiar} disabled={!link} style={{
          fontSize: 13, padding: "7px 16px", borderRadius: 6, cursor: link ? "pointer" : "default",
          background: copied ? "#dcfce7" : "#1a1a2e",
          color: copied ? "#166534" : "white",
          border: copied ? "1px solid #86efac" : "none",
          fontWeight: 500, fontFamily: "inherit",
          opacity: link ? 1 : 0.5,
        }}>
          {copied ? "✓ Copiado" : "Copiar link"}
        </button>
        <button onClick={regenerar} disabled={regenerando} style={{
          fontSize: 13, padding: "7px 14px", borderRadius: 6, cursor: "pointer",
          border: "1px solid #e5e7eb", background: "white", color: "#6b7280",
          fontFamily: "inherit",
        }}>
          {regenerando ? "Generando…" : "Regenerar"}
        </button>
      </div>
    </div>
  );
}
