import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { adminFetch } from "@/lib/api";
import ConversacionesWrapper from "./ConversacionesWrapper";

export default async function PanelConversacionesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rolRes = await adminFetch(`/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`);
  const rol = await rolRes.json();
  if (rol.rol !== "clinica") redirect("/login?error=sin_acceso");

  const convRes = await adminFetch(
    `/admin/clinicas/${rol.clinic_id}/conversaciones?limit=250`,
    { noStore: true }
  );

  const conversaciones = convRes.ok ? await convRes.json() : [];
  const esperando = Array.isArray(conversaciones)
    ? conversaciones.filter((c: any) => c.estado === "esperando_humano").length
    : 0;

  return (
    <ConversacionesWrapper
      conversaciones={Array.isArray(conversaciones) ? conversaciones : []}
      clinicId={rol.clinic_id}
      esperando={esperando}
    />
  );
}
