"use client";
import { useState } from "react";
import ServiciosTab from "./ServiciosTab";
import ProfesionalesTab from "./ProfesionalesTab";
import SalasTab from "./SalasTab";
import ReglasTab from "./ReglasTab";

type Tab = "servicios" | "profesionales" | "salas" | "reglas";

const TABS: { id: Tab; label: string }[] = [
  { id: "servicios", label: "Servicios" },
  { id: "profesionales", label: "Profesionales" },
  { id: "salas", label: "Salas / Recursos" },
  { id: "reglas", label: "Reglas de reserva" },
];

export default function AgendaConfig({
  clinicId,
  initialServicios,
  initialProfesionales,
  initialSalas,
  initialReglas,
}: {
  clinicId: string;
  initialServicios: any[];
  initialProfesionales: any[];
  initialSalas: any[];
  initialReglas: Record<string, any>;
}) {
  const [tab, setTab] = useState<Tab>("servicios");

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>
          Configuración de agenda
        </h1>
        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
          Servicios, profesionales, salas y reglas de reserva del agente IA.
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb",
        marginBottom: 28,
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "9px 16px",
              fontSize: 13.5,
              fontWeight: tab === t.id ? 600 : 500,
              color: tab === t.id ? "#2563eb" : "#6b7280",
              background: "transparent",
              border: "none",
              borderBottom: tab === t.id ? "2px solid #2563eb" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
              fontFamily: "inherit",
              transition: "color 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "servicios" && (
        <ServiciosTab clinicId={clinicId} initialServicios={initialServicios} salas={initialSalas} />
      )}
      {tab === "profesionales" && (
        <ProfesionalesTab clinicId={clinicId} initialProfesionales={initialProfesionales} servicios={initialServicios} />
      )}
      {tab === "salas" && (
        <SalasTab clinicId={clinicId} initialSalas={initialSalas} />
      )}
      {tab === "reglas" && (
        <ReglasTab clinicId={clinicId} initialReglas={initialReglas} />
      )}
    </div>
  );
}
