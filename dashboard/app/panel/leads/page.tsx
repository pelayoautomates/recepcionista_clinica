import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { adminFetch } from "@/lib/api";
import LeadsWrapper from "./LeadsWrapper";

export default async function PanelLeadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rolRes = await adminFetch(`/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`);
  const rol = await rolRes.json();
  if (rol.rol !== "clinica") redirect("/login?error=sin_acceso");

  const clinicId: string = rol.clinic_id;

  const [leadsRes, listaRes, recRes] = await Promise.all([
    adminFetch(`/admin/clinicas/${clinicId}/leads`, { noStore: true }),
    adminFetch(`/admin/clinicas/${clinicId}/lista-espera`, { noStore: true }),
    adminFetch(`/admin/clinicas/${clinicId}/recuperacion`, { noStore: true }),
  ]);

  const leads = leadsRes.ok ? await leadsRes.json() : [];
  const listaEspera = listaRes.ok ? await listaRes.json() : [];
  const recuperacion = recRes.ok ? await recRes.json() : [];

  return (
    <LeadsWrapper
      leads={Array.isArray(leads) ? leads : []}
      listaEspera={Array.isArray(listaEspera) ? listaEspera : []}
      recuperacion={Array.isArray(recuperacion) ? recuperacion : []}
      clinicId={clinicId}
    />
  );
}
