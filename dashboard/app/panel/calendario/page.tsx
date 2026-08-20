import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CalendarioCliente from "./CalendarioCliente";
import { adminFetch } from "@/lib/api";

export default async function CalendarioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rolRes = await adminFetch(
    `/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`,
    { noStore: true }
  );
  const rol = await rolRes.json();
  if (rol.rol !== "clinica") redirect("/login?error=sin_acceso");

  const clinicaRes = await adminFetch(`/admin/clinicas/${rol.clinic_id}`, { noStore: true });
  const clinica = clinicaRes.ok ? await clinicaRes.json() : {};

  const tieneCalendario = !!clinica.google_tokens_enc;
  const googleAuthUrl = `/api/google-calendar/start?clinic_id=${encodeURIComponent(rol.clinic_id)}`;

  return (
    <CalendarioCliente
      clinicId={rol.clinic_id}
      tieneCalendario={tieneCalendario}
      googleAuthUrl={googleAuthUrl}
    />
  );
}
