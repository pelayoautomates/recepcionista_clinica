"use client";
import { useState } from "react";
import LeadsClient from "./LeadsClient";
import ListaEsperaClient from "../lista-espera/ListaEsperaClient";
import RecuperacionClient from "../recuperacion/RecuperacionClient";

type Tab = "leads" | "lista-espera" | "recuperacion";

interface Props {
  leads: any[];
  listaEspera: any[];
  recuperacion: any[];
  clinicId: string;
}

export default function LeadsWrapper({ leads, listaEspera, recuperacion, clinicId }: Props) {
  const [tab, setTab] = useState<Tab>("leads");

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "leads", label: "Leads", count: leads.length },
    { key: "lista-espera", label: "Lista de espera", count: listaEspera.filter((e: any) => e.estado === "esperando").length },
    { key: "recuperacion", label: "Recuperación", count: recuperacion.length },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb" }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px",
                fontSize: 13.5,
                fontWeight: tab === t.key ? 600 : 500,
                color: tab === t.key ? "#2563eb" : "#6b7280",
                background: "none", border: "none",
                borderBottom: tab === t.key ? "2px solid #2563eb" : "2px solid transparent",
                cursor: "pointer", fontFamily: "inherit", marginBottom: -1,
              }}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span style={{
                  minWidth: 18, height: 18, borderRadius: 9,
                  background: tab === t.key ? "#2563eb" : "#e5e7eb",
                  color: tab === t.key ? "white" : "#6b7280",
                  fontSize: 10.5, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px",
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === "leads" && <LeadsClient leads={leads} />}
      {tab === "lista-espera" && <ListaEsperaClient clinicId={clinicId} initialLista={listaEspera} />}
      {tab === "recuperacion" && <RecuperacionClient clinicId={clinicId} initialLeads={recuperacion} />}
    </div>
  );
}
