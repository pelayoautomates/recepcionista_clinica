import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ConversacionDetalle from "./ConversacionDetalle";
import { adminFetch } from "@/lib/api";

export default async function ConversacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rolRes = await adminFetch(
    `/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`,
    { noStore: true }
  );
  const rol = await rolRes.json();
  if (rol.rol !== "clinica") redirect("/login?error=sin_acceso");

  const clinic_id = rol.clinic_id;

  const convRes = await adminFetch(
    `/admin/clinicas/${clinic_id}/conversaciones/${id}`,
    { noStore: true }
  );
  if (!convRes.ok) redirect("/panel/conversaciones");
  const conv = await convRes.json();

  let paciente = null;
  if (conv.paciente_id) {
    const pRes = await adminFetch(`/admin/clinicas/${clinic_id}/leads/${conv.paciente_id}`, { noStore: true });
    if (pRes.ok) paciente = await pRes.json();
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  return (
    <ConversacionDetalle
      conv={conv}
      paciente={paciente}
      clinic_id={clinic_id}
      backendUrl={backendUrl}
    />
  );
}
