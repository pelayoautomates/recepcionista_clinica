import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { adminFetch } from "@/lib/api";
import CitasClient from "./CitasClient";

export default async function PanelCitasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rolRes = await adminFetch(`/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`);
  const rol = await rolRes.json();
  if (rol.rol !== "clinica") redirect("/login?error=sin_acceso");

  const hoy = new Date().toISOString().split("T")[0];
  const res = await adminFetch(`/admin/clinicas/${rol.clinic_id}/citas?fecha=${hoy}`, { noStore: true });
  const citas = res.ok ? await res.json() : [];

  const fechaLabel = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return <CitasClient citas={citas} fechaLabel={fechaLabel} />;
}
