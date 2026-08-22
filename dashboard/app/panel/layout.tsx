import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { adminFetch } from "@/lib/api";
import PanelSidebar from "@/components/PanelSidebar";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import GuidedTour from "@/components/GuidedTour";

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

  const [clinicaRes, metricasRes, preflightRes] = await Promise.all([
    adminFetch(`/admin/clinicas/${rol.clinic_id}`),
    adminFetch(`/admin/clinicas/${rol.clinic_id}/metricas`),
    adminFetch(`/admin/clinicas/${rol.clinic_id}/preflight`, { noStore: true }),
  ]);
  const clinica = await clinicaRes.json();
  const metricas = await metricasRes.json().catch(() => ({}));
  const preflight = await preflightRes.json().catch(() => null);

  // Días restantes de trial
  const trialDiasRestantes = rol.trial_expires_at && rol.plan === "trial"
    ? Math.ceil((new Date(rol.trial_expires_at).getTime() - Date.now()) / 86_400_000)
    : undefined;

  // Checklist de onboarding. Lo calcula el backend en /preflight para que el panel
  // y el agente coincidan en qué significa "lista para atender": faltaban servicios
  // reservables y profesionales con agenda, sin los cuales la IA no puede dar cita
  // por mucho que el teléfono suene.
  type PreflightCheck = { id: string; label: string; ok: boolean; href?: string };
  const checklistItems =
    preflight?.checks?.map((c: PreflightCheck) => ({
      id: c.id,
      label: c.label,
      done: c.ok,
      href: c.href,
    })) ?? [
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
  const onboardingCompleto = checklistItems.every((i: { done: boolean }) => i.done);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f6f7f9" }}>
      <style>{`
        @media (max-width: 767px) {
          #panel-main-content { margin-left: 0 !important; }
          #panel-header { padding-left: 64px !important; }
          #panel-main { padding: 16px !important; overflow-x: hidden !important; width: 100% !important; box-sizing: border-box !important; }
        }
      `}</style>
      <PanelSidebar
        clinicName={clinica.nombre}
        pendientesHumano={metricas.conversaciones_esperando_humano ?? 0}
      />

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

      {/* Guided tour — solo para usuarios nuevos */}
      <GuidedTour
        clinicId={rol.clinic_id}
        clinicName={clinica.nombre}
        isNewUser={!clinica.onboarding_ok}
        gcalConnected={Boolean(clinica.google_tokens_enc)}
      />
    </div>
  );
}
