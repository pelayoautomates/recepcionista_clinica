"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function CompletingPage() {
  const [mensaje, setMensaje] = useState("Completando acceso...");

  useEffect(() => {
    async function completar() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login?error=sin_sesion";
        return;
      }

      const token = localStorage.getItem("pending_invite");

      if (token) {
        setMensaje("Vinculando tu clínica...");
        try {
          const res = await fetch(`${BACKEND}/admin/invitaciones/vincular`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, user_id: user.id, email: user.email }),
          });
          localStorage.removeItem("pending_invite");
          if (res.ok) {
            window.location.href = "/panel";
            return;
          } else {
            window.location.href = "/login?error=invitacion_invalida";
            return;
          }
        } catch {
          window.location.href = "/login?error=backend_timeout";
          return;
        }
      }

      // Sin token → comprobar si ya tiene acceso
      try {
        const rolRes = await fetch(
          `${BACKEND}/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`
        );
        const rolData = await rolRes.json();
        if (rolData.rol === "clinica") {
          window.location.href = "/panel";
        } else {
          window.location.href = "/login?error=sin_acceso";
        }
      } catch {
        window.location.href = "/login?error=sin_acceso";
      }
    }

    completar();
  }, []);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#f5f5f5",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🏥</div>
        <p style={{ color: "#6b7280", fontSize: 15 }}>{mensaje}</p>
      </div>
    </div>
  );
}
