"use client";

import { useState } from "react";
import Link from "next/link";

type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href?: string;
};

type Props = {
  items: ChecklistItem[];
  trialDiasRestantes?: number;
};

export default function OnboardingChecklist({ items, trialDiasRestantes }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const totalDone = items.filter(i => i.done).length;
  const allDone = totalDone === items.length;

  if (dismissed || allDone) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      zIndex: 1000,
      width: collapsed ? "auto" : 300,
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    }}>
      {/* Collapsed pill */}
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          style={{
            background: "linear-gradient(135deg, #2563eb, #4f46e5)",
            color: "white",
            border: "none",
            borderRadius: 999,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(37,99,235,0.4)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{
            width: 20, height: 20, borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700,
          }}>
            {totalDone}/{items.length}
          </span>
          Configuración pendiente
        </button>
      ) : (
        <div style={{
          background: "white",
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}>
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #2563eb, #4f46e5)",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div>
              <p style={{ margin: 0, color: "white", fontWeight: 700, fontSize: 13 }}>
                Configuración inicial
              </p>
              {trialDiasRestantes !== undefined && trialDiasRestantes > 0 && (
                <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.75)", fontSize: 11 }}>
                  {trialDiasRestantes} días de prueba restantes
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setCollapsed(true)}
                style={iconBtn}
                title="Minimizar"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              <button
                onClick={() => setDismissed(true)}
                style={iconBtn}
                title="Cerrar"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, background: "#e5e7eb" }}>
            <div style={{
              height: "100%",
              width: `${(totalDone / items.length) * 100}%`,
              background: "linear-gradient(90deg, #2563eb, #4f46e5)",
              transition: "width 0.4s ease",
            }} />
          </div>

          {/* Items */}
          <div style={{ padding: "12px 0" }}>
            {items.map(item => (
              <div key={item.id} style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 16px",
              }}>
                {/* Check circle */}
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: item.done ? "#dcfce7" : "#f3f4f6",
                  border: item.done ? "none" : "1.5px solid #d1d5db",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {item.done && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#166534" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>

                {/* Label / Link */}
                {item.done || !item.href ? (
                  <span style={{
                    fontSize: 13,
                    color: item.done ? "#6b7280" : "#111827",
                    fontWeight: item.done ? 400 : 500,
                    textDecoration: item.done ? "line-through" : "none",
                  }}>
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href} style={{
                    fontSize: 13,
                    color: "#2563eb",
                    fontWeight: 500,
                    textDecoration: "none",
                  }}>
                    {item.label} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.15)",
  border: "none",
  borderRadius: 6,
  width: 26, height: 26,
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
  padding: 0,
};
