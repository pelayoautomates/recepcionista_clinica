"use client";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error = searchParams.get("error");
  const msg = searchParams.get("msg");

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback${token ? `?token=${token}` : ""}`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#f5f5f5",
    }}>
      <div style={{
        background: "white", borderRadius: 12, padding: "48px 40px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center", maxWidth: 380, width: "100%",
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🏥</div>
        <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#1a1a2e" }}>
          Recepcionista IA
        </h1>
        <p style={{ margin: "0 0 32px", color: "#6b7280", fontSize: 14 }}>
          {token
            ? "Inicia sesión para acceder al panel de tu clínica"
            : "Panel de gestión de la agencia"}
        </p>

        {error && (
          <div style={{ marginBottom: 16, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, fontSize: 13, color: "#991b1b", textAlign: "left" }}>
            Error: {error}{msg ? ` — ${msg}` : ""}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 8, cursor: "pointer",
            border: "1px solid #d1d5db", background: "white", fontSize: 15,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            fontWeight: 500, color: "#374151",
          }}
        >
          <GoogleIcon />
          Entrar con Google
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
