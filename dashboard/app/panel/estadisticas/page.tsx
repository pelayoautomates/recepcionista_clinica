import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { adminFetch } from "@/lib/api";
import EstadisticasClient from "./EstadisticasClient";

export default async function EstadisticasPage() {
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

  const clinic_id: string = rol.clinic_id;

  const [analyticsRes, clinicaRes] = await Promise.all([
    adminFetch(`/admin/clinicas/${clinic_id}/analytics?dias=30`, { noStore: true }),
    adminFetch(`/admin/clinicas/${clinic_id}`, { noStore: true }),
  ]);

  const analytics = analyticsRes.ok ? await analyticsRes.json() : null;
  const clinica = clinicaRes.ok ? await clinicaRes.json() : {};

  return (
    <EstadisticasClient
      clinicId={clinic_id}
      initialData={analytics}
      clinicaNombre={clinica.nombre ?? ""}
    />
  );
}
