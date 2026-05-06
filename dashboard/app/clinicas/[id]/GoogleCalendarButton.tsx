"use client";
import { useState } from "react";

export default function GoogleCalendarButton({ url, compact }: { url: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <a href={url} style={{
        fontSize: 12, padding: "5px 12px", borderRadius: 6, cursor: "pointer",
        border: "none", background: "#166534", color: "white", textDecoration: "none",
        whiteSpace: "nowrap", flexShrink: 0,
      }}>
        Conectar →
      </a>
    );
  }

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
