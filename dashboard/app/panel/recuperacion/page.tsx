import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { adminFetch } from "@/lib/api";
import RecuperacionClient from "./RecuperacionClient";

export default async function RecuperacionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rolRes = await adminFetch(
    `/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`,
    { noStore: true }
  );
  const rol = await rolRes.json();
  if (rol.rol !== "clinica") redirect("/login");

  const clinicId: string = rol.clinic_id;
  const leadsRes = await adminFetch(`/admin/clinicas/${clinicId}/recuperacion`, { noStore: true });
  const leads = await leadsRes.json();

  return (
    <RecuperacionClient
      clinicId={clinicId}
      initialLeads={Array.isArray(leads) ? leads : []}
    />
  );
}
