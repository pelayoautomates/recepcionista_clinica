import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { adminFetch } from "@/lib/api";
import LeadsClient from "./LeadsClient";

export default async function PanelLeadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rolRes = await adminFetch(`/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`);
  const rol = await rolRes.json();
  if (rol.rol !== "clinica") redirect("/login?error=sin_acceso");

  const res = await adminFetch(`/admin/clinicas/${rol.clinic_id}/leads`, { noStore: true });
  const leads = res.ok ? await res.json() : [];

  return <LeadsClient leads={leads} />;
}
