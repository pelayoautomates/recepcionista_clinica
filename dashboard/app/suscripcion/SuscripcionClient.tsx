"use client";
import { useState } from "react";
import { PLANS } from "@/lib/marketing-content";

export default function SuscripcionClient() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function contratar(planId: string) {
    setLoading(planId);
    setError("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Error al crear sesión de pago");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (e: any) {
      setError(e.message);
      setLoading(null);
    }
  }

  return (
    <div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 16,
        marginBottom: 24,
      }}>
        {PLANS.map(p => {
          const highlight = p.id === "pro";
          return (
          <div key={p.id} style={{
            background: highlight
              ? "linear-gradient(135deg, #eff6ff, #eef2ff)"
              : "white",
            border: highlight ? "2px solid #2563eb" : "1px solid #e5e7eb",
            borderRadius: 14,
            padding: "24px 20px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 16, color: highlight ? "#1e40af" : "#111827" }}>
                  {highlight && <span style={{
                    fontSize: 10, fontWeight: 700, background: "#2563eb", color: "white",
                    padding: "2px 7px", borderRadius: 20, marginRight: 6, verticalAlign: "middle",
                  }}>POPULAR</span>}
                  {p.name}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>{p.subtitle}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 24, color: "#111827" }}>{p.monthly}€</p>
                <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>/mes</p>
              </div>
            </div>
            <ul style={{ margin: "0 0 20px", padding: "0 0 0 16px", fontSize: 12.5, color: "#374151", lineHeight: 1.9 }}>
              {p.features.map(f => <li key={f}>{f}</li>)}
            </ul>
            <button
              onClick={() => contratar(p.id)}
              disabled={!!loading}
              style={{
                width: "100%", padding: "11px 16px", borderRadius: 8, border: "none",
                background: highlight
                  ? "linear-gradient(135deg, #2563eb, #4f46e5)"
                  : "#f3f4f6",
                color: highlight ? "white" : "#374151",
                fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit", opacity: loading === p.id ? 0.7 : 1,
              }}
            >
              {loading === p.id ? "Redirigiendo..." : `Contratar ${p.name}`}
            </button>
          </div>
          );
        })}
      </div>
      {error && (
        <p style={{ textAlign: "center", color: "#dc2626", fontSize: 13 }}>{error}</p>
      )}
      <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", margin: 0 }}>
        Sin permanencia · Cancela cuando quieras · IVA no incluido
      </p>
    </div>
  );
}
