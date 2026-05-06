import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CalendarioCliente from "./CalendarioCliente";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

export default async function CalendarioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rolRes = await fetch(
    `${BACKEND}/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`,
    { cache: "no-store" }
  );
  const rol = await rolRes.json();
  if (rol.rol !== "clinica") redirect("/login?error=sin_acceso");

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  return <CalendarioCliente clinicId={rol.clinic_id} backendUrl={backendUrl} />;
}
