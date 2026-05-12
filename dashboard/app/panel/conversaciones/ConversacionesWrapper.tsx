"use client";
import { useState } from "react";
import Link from "next/link";
import CanalesClient from "../canales/CanalesClient";

type Conv = {
  id: string;
  canal: string | null;
  estado: string;
  updated_at: string;
};

const ESTADO_STYLE: Record<string, { bg: string; color: string }> = {
  activa:            { bg: "#dcfce7", color: "#166534" },
  esperando_humano:  { bg: "#fef3c7", color: "#92400e" },
  resuelta:          { bg: "#f3f4f6", color: "#6b7280" },
};

const ESTADO_LABEL: Record<string, string> = {
  activa: "Activa",
  esperando_humano: "Esperando humano",
  resuelta: "Resuelta",
};

const CANAL_LABEL: Record<string, string> = {
  chat_web: "Chat web", whatsapp: "WhatsApp", voz: "Llamada",
};

type Tab = "conversaciones" | "canales";

interface Props {
  conversaciones: Conv[];
  clinicId: string;
  telefono: string | null;
  twilioNumber: string | null;
  twilioConfigured: boolean;
  smsActivo: boolean;
  esperando: number;
}

export default function ConversacionesWrapper({ conversaciones, clinicId, telefono, twilioNumber, twilioConfigured, smsActivo, esperando }: Props) {
  const [tab, setTab] = useState<Tab>("conversaciones");

  return (
    <div>
      {/* Header + tabs */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, margin: 0, fontWeight: 700, color: "#111827" }}>Conversaciones</h1>
          {esperando > 0 && tab === "conversaciones" && (
            <span style={{ background: "#f59e0b", color: "white", borderRadius: 12, padding: "4px 14px", fontSize: 13, fontWeight: 600 }}>
              {esperando} esperando respuesta
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb" }}>
          {(["conversaciones", "canales"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "8px 16px",
                fontSize: 13.5,
                fontWeight: tab === t ? 600 : 500,
                color: tab === t ? "#2563eb" : "#6b7280",
                background: "none",
                border: "none",
                borderBottom: tab === t ? "2px solid #2563eb" : "2px solid transparent",
                cursor: "pointer",
                fontFamily: "inherit",
                marginBottom: -1,
              }}
            >
              {t === "conversaciones" ? "Conversaciones" : "Canales"}
            </button>
          ))}
        </div>
      </div>

      {tab === "conversaciones" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {conversaciones.map(conv => {
            const estilo = ESTADO_STYLE[conv.estado] || ESTADO_STYLE.resuelta;
            return (
              <Link key={conv.id} href={`/panel/conversaciones/${conv.id}`} style={{ textDecoration: "none" }}>
                <div style={{
                  background: "white", borderRadius: 8, padding: "14px 20px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  border: conv.estado === "esperando_humano" ? "2px solid #f59e0b" : "1px solid #e5e7eb",
                  cursor: "pointer",
                }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14, color: "#111827" }}>
                      {CANAL_LABEL[conv.canal ?? ""] || conv.canal || "—"}
                    </div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                      {new Date(conv.updated_at).toLocaleString("es-ES")}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ background: estilo.bg, color: estilo.color, borderRadius: 12, padding: "2px 10px", fontSize: 12, fontWeight: 500 }}>
                      {ESTADO_LABEL[conv.estado] || conv.estado}
                    </span>
                    <span style={{ color: "#9ca3af", fontSize: 16 }}>→</span>
                  </div>
                </div>
              </Link>
            );
          })}
          {conversaciones.length === 0 && (
            <div style={{ background: "white", borderRadius: 8, padding: 48, textAlign: "center", color: "#9ca3af", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
              No hay conversaciones todavía
            </div>
          )}
        </div>
      )}

      {tab === "canales" && (
        <CanalesClient
          clinicId={clinicId}
          telefono={telefono}
          twilioNumber={twilioNumber}
          twilioConfigured={twilioConfigured}
          smsActivo={smsActivo}
          compact
        />
      )}
    </div>
  );
}
