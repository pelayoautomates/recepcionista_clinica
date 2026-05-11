import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { adminFetch } from "@/lib/api";
import FacturacionClient from "./FacturacionClient";

export default async function FacturacionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rolRes = await adminFetch(
    `/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`,
    { noStore: true }
  );
  const rol = await rolRes.json();
  if (rol.rol !== "clinica") redirect("/login");

  const clinicRes = await adminFetch(`/admin/clinicas/${rol.clinic_id}`, { noStore: true });
  const clinica = await clinicRes.json();

  return (
    <FacturacionClient
      plan={clinica.plan ?? "trial"}
      minutosUsados={clinica.minutos_usados_mes ?? 0}
      minutosIncluidos={clinica.minutos_incluidos ?? 100}
      trialExpires={clinica.trial_expires_at ?? null}
      stripeSubStatus={clinica.stripe_subscription_status ?? null}
      hasStripeCustomer={!!clinica.stripe_customer_id}
    />
  );
}
