"use client";
import { useState } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function InvitacionButton({ clinicId }: { clinicId: string }) {
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const generar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/admin/clinicas/${clinicId}/invitacion`, { method: "POST" });
      const data = await res.json();
      setLink(`${SITE_URL}/login?token=${data.token}`);
    } finally {
      setLoading(false);
    }
  };

  const copiar = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 10px" }}>
        Genera un link único para que el cliente acceda a su panel con Google.
      </p>
      {!link ? (
        <button onClick={generar} disabled={loading} style={{
          fontSize: 13, padding: "7px 14px", borderRadius: 6, cursor: "pointer",
          background: "#1a1a2e", color: "white", border: "none",
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? "Generando..." : "Generar link de acceso"}
        </button>
      ) : (
        <div>
          <div style={{
            background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6,
            padding: "8px 10px", fontSize: 12, fontFamily: "monospace",
            wordBreak: "break-all", marginBottom: 8, color: "#374151",
          }}>
            {link}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={copiar} style={{
              fontSize: 13, padding: "6px 12px", borderRadius: 6, cursor: "pointer",
              border: "1px solid #d1d5db",
              background: copied ? "#dcfce7" : "white",
              color: copied ? "#166534" : "#374151",
            }}>
              {copied ? "✓ Copiado" : "Copiar link"}
            </button>
            <button onClick={generar} style={{
              fontSize: 13, padding: "6px 12px", borderRadius: 6, cursor: "pointer",
              border: "1px solid #d1d5db", background: "white", color: "#6b7280",
            }}>
              Generar otro
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "8px 0 0" }}>
            Mándale este link al cliente. Cuando entre con su Google quedará vinculado a esta clínica.
          </p>
        </div>
      )}
    </div>
  );
}
