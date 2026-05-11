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

  const [convRes, canalesRes] = await Promise.all([
    adminFetch(`/admin/clinicas/${rol.clinic_id}/conversaciones`, { noStore: true }),
    adminFetch(`/admin/clinicas/${rol.clinic_id}/canales`, { noStore: true }),
  ]);

  const conversaciones = convRes.ok ? await convRes.json() : [];
  const canales = canalesRes.ok ? await canalesRes.json() : {};
  const esperando = conversaciones.filter((c: any) => c.estado === "esperando_humano").length;

  return (
    <ConversacionesWrapper
      conversaciones={Array.isArray(conversaciones) ? conversaciones : []}
      clinicId={rol.clinic_id}
      telefono={canales.telefono || null}
      whatsappNumber={canales.whatsapp_number || null}
      dialog360={canales.whatsapp_360dialog || undefined}
      esperando={esperando}
    />
  );
}
