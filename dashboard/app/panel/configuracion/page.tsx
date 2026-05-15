import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { adminFetch } from "@/lib/api";
import ConfiguracionWrapper from "./ConfiguracionWrapper";

export default async function ConfiguracionPage() {
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

  const [clinicaRes, conocimientoRes] = await Promise.all([
    adminFetch(`/admin/clinicas/${clinicId}`, { noStore: true }),
    adminFetch(`/admin/clinicas/${clinicId}/conocimiento`, { noStore: true }),
  ]);

  const clinica = clinicaRes.ok ? await clinicaRes.json() : {};
  const conocimiento = conocimientoRes.ok ? await conocimientoRes.json() : [];

  return (
    <ConfiguracionWrapper
      clinica={clinica}
      clinicId={clinicId}
      conocimiento={Array.isArray(conocimiento) ? conocimiento : []}
    />
  );
}
