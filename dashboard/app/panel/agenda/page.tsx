import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { adminFetch } from "@/lib/api";
import AgendaConfig from "./AgendaConfig";

export default async function AgendaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rolRes = await adminFetch(
    `/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`,
    { noStore: true }
  );
  if (!rolRes.ok) redirect("/login");
  const rol = await rolRes.json();
  if (rol.rol !== "clinica") redirect("/login?error=sin_acceso");

  const clinicId: string = rol.clinic_id;

  const [serviciosRes, profesionalesRes, salasRes, reglasRes] = await Promise.all([
    adminFetch(`/admin/clinicas/${clinicId}/servicios?solo_activos=false`, { noStore: true }),
    adminFetch(`/admin/clinicas/${clinicId}/profesionales`, { noStore: true }),
    adminFetch(`/admin/clinicas/${clinicId}/salas?solo_activas=false`, { noStore: true }),
    adminFetch(`/admin/clinicas/${clinicId}/reglas`, { noStore: true }),
  ]);

  const servicios     = serviciosRes.ok     ? await serviciosRes.json()     : [];
  const profesionales = profesionalesRes.ok ? await profesionalesRes.json() : [];
  const salas         = salasRes.ok         ? await salasRes.json()         : [];
  const reglas        = reglasRes.ok        ? await reglasRes.json()        : {};

  return (
    <AgendaConfig
      clinicId={clinicId}
      initialServicios={Array.isArray(servicios) ? servicios : []}
      initialProfesionales={Array.isArray(profesionales) ? profesionales : []}
      initialSalas={Array.isArray(salas) ? salas : []}
      initialReglas={reglas ?? {}}
    />
  );
}
