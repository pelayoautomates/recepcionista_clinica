import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { adminFetch } from "@/lib/api";
import ListaEsperaClient from "./ListaEsperaClient";

export default async function ListaEsperaPage() {
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
  const listaRes = await adminFetch(`/admin/clinicas/${clinicId}/lista-espera`, { noStore: true });
  const lista = await listaRes.json();

  return (
    <ListaEsperaClient
      clinicId={clinicId}
      initialLista={Array.isArray(lista) ? lista : []}
    />
  );
}
