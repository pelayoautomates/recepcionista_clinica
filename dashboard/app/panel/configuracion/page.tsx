import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { adminFetch } from "@/lib/api";
import ConfiguracionForm from "./ConfiguracionForm";

export default async function ConfiguracionPage() {
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
  const clinica = await clinicaRes.json();

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  return (
    <ConfiguracionForm
      clinica={clinica}
      clinicId={rol.clinic_id}
      backendUrl={backendUrl}
    />
  );
}
