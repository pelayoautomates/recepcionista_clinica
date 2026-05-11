"use client";
import { useState } from "react";

const PLAN_LABELS: Record<string, string> = {
  trial: "Prueba gratuita",
  starter: "Starter",
  pro: "Pro",
  growth: "Growth",
  cancelado: "Cancelado",
};

const PLAN_COLOR: Record<string, string> = {
  trial: "#d97706",
  starter: "#2563eb",
  pro: "#7c3aed",
  growth: "#059669",
  cancelado: "#dc2626",
};

const PLANES_UPGRADE = [
  { id: "starter", nombre: "Starter", precio: 99, minutos: 300 },
  { id: "pro", nombre: "Pro", precio: 179, minutos: 750 },
  { id: "growth", nombre: "Growth", precio: 299, minutos: 1800 },
];

export default function FacturacionClient({
  plan,
  minutosUsados,
  minutosIncluidos,
  trialExpires,
  stripeSubStatus,
  hasStripeCustomer,
}: {
  plan: string;
  minutosUsados: number;
  minutosIncluidos: number;
  trialExpires: string | null;
  stripeSubStatus: string | null;
  hasStripeCustomer: boolean;
}) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState("");

  const pct = minutosIncluidos > 0 ? Math.min(100, Math.round((minutosUsados / minutosIncluidos) * 100)) : 0;
  const barColor = pct >= 90 ? "#dc2626" : pct >= 70 ? "#d97706" : "#2563eb";

  async function contratar(planId: string) {
    setLoadingPlan(planId);
    setError("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Error");
      const { url } = await res.json();
      window.location.href = url;
    } catch (e: any) {
      setError(e.message);
      setLoadingPlan(null);
    }
  }

  async function abrirPortal() {
    setLoadingPortal(true);
    setError("");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Error");
      const { url } = await res.json();
      window.location.href = url;
    } catch (e: any) {
      setError(e.message);
      setLoadingPortal(false);
    }
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#111827" }}>
          Facturación y plan
        </h1>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
          Gestiona tu suscripción y consulta el uso del mes.
        </p>
      </div>

      {/* Plan actual */}
      <div style={{
        background: "white", border: "1px solid #e5e7eb", borderRadius: 14,
        padding: "24px 28px", marginBottom: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 12.5, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Plan actual
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 22, color: "#111827" }}>
                {PLAN_LABELS[plan] ?? plan}
              </span>
              <span style={{
                fontSize: 11.5, fontWeight: 600, padding: "2px 9px", borderRadius: 20,
                background: `${PLAN_COLOR[plan] ?? "#6b7280"}18`,
                color: PLAN_COLOR[plan] ?? "#6b7280",
              }}>
                {stripeSubStatus === "past_due" ? "Pago pendiente" : plan === "trial" ? "Prueba" : "Activo"}
              </span>
            </div>
            {plan === "trial" && trialExpires && (
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
                Prueba expira el {new Date(trialExpires).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
          {hasStripeCustomer && (
            <button
              onClick={abrirPortal}
              disabled={loadingPortal}
              style={{
                padding: "9px 16px", borderRadius: 8, border: "1px solid #e5e7eb",
                background: "white", color: "#374151", fontWeight: 500, fontSize: 13.5,
                cursor: loadingPortal ? "not-allowed" : "pointer", fontFamily: "inherit",
                opacity: loadingPortal ? 0.6 : 1,
              }}
            >
              {loadingPortal ? "Abriendo..." : "Gestionar suscripción →"}
            </button>
          )}
        </div>

        {/* Uso de minutos */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Minutos usados este mes</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>
              {minutosUsados} / {minutosIncluidos} min
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "#f3f4f6", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 4, width: `${pct}%`,
              background: barColor, transition: "width 0.3s ease",
            }} />
          </div>
          {pct >= 90 && (
            <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "#dc2626" }}>
              Casi sin minutos — considera actualizar tu plan.
            </p>
          )}
        </div>
      </div>

      {/* Planes de upgrade */}
      {(plan === "trial" || plan === "starter" || plan === "cancelado") && (
        <div style={{
          background: "white", border: "1px solid #e5e7eb", borderRadius: 14,
          padding: "24px 28px",
        }}>
          <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#111827" }}>
            {plan === "cancelado" ? "Reactivar plan" : "Actualizar plan"}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {PLANES_UPGRADE.filter(p => {
              if (plan === "starter") return p.id !== "starter";
              return true;
            }).map(p => (
              <div key={p.id} style={{
                border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 18px",
                display: "flex", flexDirection: "column", gap: 12,
              }}>
                <div>
                  <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 15, color: "#111827" }}>{p.nombre}</p>
                  <p style={{ margin: 0, fontSize: 12.5, color: "#6b7280" }}>{p.minutos} min/mes · {p.precio}€/mes</p>
                </div>
                <button
                  onClick={() => contratar(p.id)}
                  disabled={!!loadingPlan}
                  style={{
                    padding: "8px 14px", borderRadius: 7, border: "none",
                    background: "#2563eb", color: "white", fontWeight: 600, fontSize: 13.5,
                    cursor: loadingPlan ? "not-allowed" : "pointer", fontFamily: "inherit",
                    opacity: loadingPlan === p.id ? 0.7 : 1,
                  }}
                >
                  {loadingPlan === p.id ? "Redirigiendo..." : `Contratar`}
                </button>
              </div>
            ))}
          </div>
          {error && <p style={{ margin: "12px 0 0", fontSize: 13, color: "#dc2626" }}>{error}</p>}
        </div>
      )}

      {plan === "pro" && (
        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: "24px 28px" }}>
          <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#111827" }}>Actualizar a Growth</p>
          <div style={{ display: "inline-block" }}>
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#6b7280" }}>1.800 min/mes · 299€/mes</p>
            <button
              onClick={() => contratar("growth")}
              disabled={!!loadingPlan}
              style={{
                padding: "9px 20px", borderRadius: 8, border: "none",
                background: "#059669", color: "white", fontWeight: 600, fontSize: 14,
                cursor: loadingPlan ? "not-allowed" : "pointer", fontFamily: "inherit",
                opacity: loadingPlan === "growth" ? 0.7 : 1,
              }}
            >
              {loadingPlan === "growth" ? "Redirigiendo..." : "Actualizar a Growth →"}
            </button>
          </div>
          {error && <p style={{ margin: "12px 0 0", fontSize: 13, color: "#dc2626" }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
