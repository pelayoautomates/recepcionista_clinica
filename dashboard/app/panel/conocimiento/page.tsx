import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { adminFetch } from "@/lib/api";
import ConocimientoClient from "./ConocimientoClient";

export default async function ConocimientoPage() {
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

  const entradasRes = await adminFetch(`/admin/clinicas/${clinicId}/conocimiento`, { noStore: true });
  const entradas = await entradasRes.json();

  return (
    <ConocimientoClient
      clinicId={clinicId}
      initialEntradas={Array.isArray(entradas) ? entradas : []}
    />
  );
}
