import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { adminFetch } from "@/lib/api";
import CitasClient from "./CitasClient";

function getLocalDateISO() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
}

export default async function PanelCitasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rolRes = await adminFetch(`/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`);
  if (!rolRes.ok) redirect("/login");
  const rol = await rolRes.json();
  if (rol.rol !== "clinica") redirect("/login?error=sin_acceso");

  const hoy = getLocalDateISO();
  const canalesRes = await adminFetch(`/admin/clinicas/${rol.clinic_id}/canales`, { noStore: true });
  const canales = canalesRes.ok ? await canalesRes.json() : {};

  const citasRes = await adminFetch(`/admin/clinicas/${rol.clinic_id}/citas?fecha=${hoy}&limit=250`, { noStore: true });
  const citas = citasRes.ok ? await citasRes.json() : [];

  const fechaLabel = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });

  return (
    <CitasClient
      citas={citas}
      fechaLabel={fechaLabel}
      clinicId={rol.clinic_id}
      tieneGcal={canales.tiene_gcal ?? false}
    />
  );
}
