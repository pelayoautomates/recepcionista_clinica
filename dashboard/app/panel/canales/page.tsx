import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { adminFetch } from "@/lib/api";
import CanalesClient from "./CanalesClient";

export default async function CanalesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rolRes = await adminFetch(
    `/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`
  );
  const rol = await rolRes.json();
  if (rol.rol !== "clinica") redirect("/login?error=sin_acceso");

  const clinic_id = rol.clinic_id;

  const canalesRes = await adminFetch(`/admin/clinicas/${clinic_id}/canales`, { noStore: true });
  const canales = canalesRes.ok ? await canalesRes.json() : {};

  return (
    <CanalesClient
      clinicId={clinic_id}
      telefonoClinica={canales.telefono || null}
      telefonoIa={canales.telefono_ia || null}
      routingMode={canales.routing_mode || "si_no_contestan"}
      desvioInicial={canales.desvio || null}
      twilioNumber={canales.twilio_whatsapp_number || null}
      twilioConfigured={canales.twilio_configured ?? false}
      smsActivo={canales.sms_activo ?? false}
      metaConfigured={canales.meta_configured ?? false}
      metaPhoneNumber={canales.meta_phone_number || null}
    />
  );
}
