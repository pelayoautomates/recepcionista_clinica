"use client";
import { useState, useEffect } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function InvitacionButton({ clinicId }: { clinicId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenerando, setRegenerando] = useState(false);

  // Carga el token permanente al montar
  useEffect(() => {
    fetch(`${BACKEND}/admin/clinicas/${clinicId}/invitacion`)
      .then(r => r.json())
      .then(data => {
        if (data.token) {
          setToken(data.token);
        } else {
          // No hay token aún — lo creamos automáticamente
          return fetch(`${BACKEND}/admin/clinicas/${clinicId}/invitacion`, { method: "POST" })
            .then(r => r.json())
            .then(d => setToken(d.token));
        }
      })
      .finally(() => setLoading(false));
  }, [clinicId]);

  const link = token ? `${SITE_URL}/login?token=${token}` : "";

  const copiar = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerar = async () => {
    if (!confirm("¿Generar un nuevo link? El link actual dejará de funcionar.")) return;
    setRegenerando(true);
    await fetch(`${BACKEND}/admin/clinicas/${clinicId}/invitacion`, { method: "DELETE" });
    const res = await fetch(`${BACKEND}/admin/clinicas/${clinicId}/invitacion`, { method: "POST" });
    const data = await res.json();
    setToken(data.token);
    setRegenerando(false);
  };

  if (loading) {
    return <div style={{ fontSize: 13, color: "#9ca3af" }}>Cargando link…</div>;
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
        {link}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={copiar} style={{
          fontSize: 13, padding: "7px 16px", borderRadius: 6, cursor: "pointer",
          background: copied ? "#dcfce7" : "#1a1a2e",
          color: copied ? "#166534" : "white",
          border: copied ? "1px solid #86efac" : "none",
          fontWeight: 500,
        }}>
          {copied ? "✓ Copiado" : "Copiar link"}
        </button>
        <button onClick={regenerar} disabled={regenerando} style={{
          fontSize: 13, padding: "7px 14px", borderRadius: 6, cursor: "pointer",
          border: "1px solid #e5e7eb", background: "white", color: "#6b7280",
        }}>
          {regenerando ? "Generando…" : "Regenerar"}
        </button>
      </div>
    </div>
  );
}
