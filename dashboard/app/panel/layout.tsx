import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { adminFetch } from "@/lib/api";
import PanelSidebar from "@/components/PanelSidebar";
import OnboardingChecklist from "@/components/OnboardingChecklist";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const rolRes = await adminFetch(
    `/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`
  );
  const rol = await rolRes.json();

  // Sin clínica → onboarding
  if (!rol.rol || rol.rol !== "clinica") redirect("/onboarding");

  // Trial expirado → suscripción
  if (rol.plan === "trial" && rol.trial_expires_at) {
    const expires = new Date(rol.trial_expires_at);
    if (expires < new Date()) redirect("/suscripcion");
  }

  const clinicaRes = await adminFetch(`/admin/clinicas/${rol.clinic_id}`);
  const clinica = await clinicaRes.json();

  const userName = user.email?.split("@")[0] ?? "Usuario";

  // Días restantes de trial
  const trialDiasRestantes = rol.trial_expires_at && rol.plan === "trial"
    ? Math.ceil((new Date(rol.trial_expires_at).getTime() - Date.now()) / 86_400_000)
    : undefined;

  // Checklist de onboarding
  const checklistItems = [
    { id: "clinica", label: "Clínica configurada", done: true },
    {
      id: "agente",
      label: "Agente entrenado",
      done: Boolean(clinica.prompt_personalizado),
      href: "/panel/configuracion",
    },
    {
      id: "calendario",
      label: "Google Calendar conectado",
      done: Boolean(clinica.google_tokens_enc),
      href: "/panel/configuracion",
    },
    {
      id: "telefono",
      label: "Número de teléfono IA activo",
      done: Boolean(clinica.telefono_ia),
      href: "/panel/canales",
    },
  ];
  const onboardingCompleto = checklistItems.every(i => i.done);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f6f7f9" }}>
      <style>{`
        @media (max-width: 767px) {
          #panel-main-content { margin-left: 0 !important; }
          #panel-header { padding-left: 64px !important; }
          #panel-main { padding: 16px !important; overflow-x: hidden !important; width: 100% !important; box-sizing: border-box !important; }
        }
      `}</style>
      <PanelSidebar clinicName={clinica.nombre} />

      <div id="panel-main-content" style={{ flex: 1, marginLeft: 240, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Banner trial */}
        {trialDiasRestantes !== undefined && trialDiasRestantes <= 3 && (
          <div style={{
            background: trialDiasRestantes <= 1 ? "#fef2f2" : "#fffbeb",
            borderBottom: `1px solid ${trialDiasRestantes <= 1 ? "#fca5a5" : "#fde68a"}`,
            padding: "10px 32px",
            fontSize: 13,
            color: trialDiasRestantes <= 1 ? "#991b1b" : "#92400e",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span>
              {trialDiasRestantes <= 0
                ? "Tu prueba gratuita ha terminado."
                : `⏰ Te quedan ${trialDiasRestantes} día${trialDiasRestantes === 1 ? "" : "s"} de prueba gratuita.`}
            </span>
            <a
              href="/pricing"
              style={{
                color: trialDiasRestantes <= 1 ? "#991b1b" : "#92400e",
                fontWeight: 600,
                textDecoration: "underline",
                fontSize: 13,
              }}
            >
              Ver planes →
            </a>
          </div>
        )}

        {/* Top bar */}
        <header id="panel-header" style={{
          height: 60,
          background: "white",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "0 28px",
          position: "sticky",
          top: 0,
          zIndex: 30,
          gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ position: "relative", cursor: "pointer" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2.5C7.24 2.5 5 4.74 5 7.5V11L3 13H17L15 11V7.5C15 4.74 12.76 2.5 10 2.5Z" stroke="#6b7280" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M8.5 15C8.5 15.83 9.17 16.5 10 16.5C10.83 16.5 11.5 15.83 11.5 15" stroke="#6b7280" strokeWidth="1.5" />
              </svg>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <div style={{
                width: 32, height: 32,
                background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontSize: 12, fontWeight: 700,
              }}>
                {userName.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "#111827" }}>
                {clinica.nombre}
              </span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="#9ca3af" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </header>

        <main id="panel-main" style={{ flex: 1, padding: "28px 32px" }}>
          {children}
        </main>
      </div>

      {/* Checklist flotante — solo si hay pasos pendientes */}
      {!onboardingCompleto && (
        <OnboardingChecklist
          items={checklistItems}
          trialDiasRestantes={trialDiasRestantes}
        />
      )}
    </div>
  );
}
