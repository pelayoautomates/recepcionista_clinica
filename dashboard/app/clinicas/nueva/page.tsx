import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NuevaClinicaForm from "./NuevaClinicaForm";

/**
 * Alta de una clínica nueva.
 *
 * `/agencia` ya enlazaba aquí con los botones "Nueva clínica" y "Crear clínica",
 * pero la página no existía: llevaban a un 404. No había forma de dar de alta a
 * un cliente desde la interfaz, solo llamando a la API a mano.
 *
 * Se guarda en el servidor igual que `/agencia`: el middleware protege la ruta,
 * pero la comprobación real vive aquí.
 */
export default async function NuevaClinicaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const superadminEmail = process.env.SUPERADMIN_EMAIL;

  if (!user || !superadminEmail || user.email !== superadminEmail) {
    redirect("/panel");
  }

  return <NuevaClinicaForm />;
}
