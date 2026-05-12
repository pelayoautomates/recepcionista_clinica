"use client";
import { useState } from "react";
import ConfiguracionForm from "./ConfiguracionForm";
import ConocimientoClient from "../conocimiento/ConocimientoClient";
import RoutingConfig from "./RoutingConfig";
import TestAgente from "./TestAgente";

type Tab = "clinica" | "conocimiento" | "llamadas" | "test";

interface Props {
  clinica: any;
  clinicId: string;
  conocimiento: any[];
}

export default function ConfiguracionWrapper({ clinica, clinicId, conocimiento }: Props) {
  const [tab, setTab] = useState<Tab>("clinica");

  const tabs: { key: Tab; label: string }[] = [
    { key: "clinica",      label: "Clínica y agente" },
    { key: "conocimiento", label: "Conocimiento" },
    { key: "llamadas",     label: "Llamadas" },
    { key: "test",         label: "Probar agente" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: "#111827" }}>Configuración</h1>
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb" }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "8px 16px", fontSize: 13.5,
                fontWeight: tab === t.key ? 600 : 500,
                color: tab === t.key ? "#2563eb" : "#6b7280",
                background: "none", border: "none",
                borderBottom: tab === t.key ? "2px solid #2563eb" : "2px solid transparent",
                cursor: "pointer", fontFamily: "inherit", marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "clinica" && (
        <ConfiguracionForm clinica={clinica} clinicId={clinicId} />
      )}
      {tab === "conocimiento" && (
        <ConocimientoClient clinicId={clinicId} initialEntradas={conocimiento} />
      )}
      {tab === "llamadas" && (
        <RoutingConfig
          clinicId={clinicId}
          initialMode={clinica.routing_mode || "siempre"}
          initialEmail={clinica.notification_email || ""}
        />
      )}
      {tab === "test" && (
        <TestAgente
          clinicId={clinicId}
          agenteName={clinica.agente_nombre || "Valeria"}
        />
      )}
    </div>
  );
}
