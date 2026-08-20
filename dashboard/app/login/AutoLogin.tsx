"use client";
import { useEffect, useRef } from "react";
import { signInWithGoogle } from "./actions";

export default function AutoLogin({ token }: { token?: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.requestSubmit();
  }, []);

  // El formulario se envía solo. La pantalla evita el flash en blanco mientras
  // Supabase fija las cookies PKCE y redirige a Google, y sirve de fallback
  // manual si el envío automático no llega a dispararse.
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        background: "#f9fafb",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <style>{`@keyframes atiende-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          width: 34,
          height: 34,
          border: "3px solid #e5e7eb",
          borderTopColor: "#166634",
          borderRadius: "50%",
          animation: "atiende-spin 0.8s linear infinite",
        }}
      />
      <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>Conectando con Google…</p>

      <form ref={formRef} action={signInWithGoogle.bind(null, token)}>
        <button
          type="submit"
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background: "white",
            color: "#374151",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Continuar con Google
        </button>
      </form>
    </div>
  );
}
