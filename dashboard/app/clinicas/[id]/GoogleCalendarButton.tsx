"use client";
import { useState } from "react";

export default function GoogleCalendarButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={copy} style={{
        fontSize: 13, padding: "6px 12px", borderRadius: 6, cursor: "pointer",
        border: "1px solid #d1d5db", background: copied ? "#dcfce7" : "white",
        color: copied ? "#166534" : "#374151",
      }}>
        {copied ? "✓ Copiado" : "Copiar enlace"}
      </button>
      <a href={url} target="_blank" rel="noopener noreferrer" style={{
        fontSize: 13, padding: "6px 12px", borderRadius: 6, cursor: "pointer",
        border: "none", background: "#1a1a2e", color: "white", textDecoration: "none",
      }}>
        Probar enlace →
      </a>
    </div>
  );
}
