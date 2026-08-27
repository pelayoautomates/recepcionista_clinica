import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminFetch } from "@/lib/api";

type Access = {
  userId: string;
  email: string;
  role: string;
  clinicId: string | null;
};

export async function requireAccess(): Promise<Access | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ detail: "No autenticado" }, { status: 401 });
  }

  const email = user.email ?? "";
  const roleRes = await adminFetch(
    `/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(email)}`,
    { noStore: true }
  );

  if (!roleRes.ok) {
    return NextResponse.json({ detail: "No se pudo validar acceso" }, { status: 403 });
  }

  const roleData = await roleRes.json();
  return {
    userId: user.id,
    email,
    role: roleData.rol,
    clinicId: roleData.clinic_id ?? null,
  };
}

export function enforceClinicScope(
  access: Access,
  clinicId: string
): NextResponse | null {
  // La agencia administra todas sus clínicas. Sin esto, el alta de un cliente se
  // quedaba a medias: podía crearse la clínica (rol "agencia") pero no generarle
  // el enlace de acceso ni configurarla, porque esta función exigía rol "clinica"
  // con el clinic_id coincidiendo. Nadie podía dar de alta a nadie.
  //
  // El rol lo resuelve el backend contra `agencia_admins`; no viene del cliente,
  // así que no se puede falsear desde el navegador. Aun así, esta es la frontera
  // multi-tenant de la API: ampliarla es deliberado y solo cubre a las cuentas
  // que estén en esa tabla.
  if (access.role === "agencia") {
    return null;
  }
  if (access.role !== "clinica") {
    return NextResponse.json({ detail: "Sin acceso" }, { status: 403 });
  }
  if (!access.clinicId || access.clinicId !== clinicId) {
    return NextResponse.json({ detail: "Sin acceso a esta clinica" }, { status: 403 });
  }
  return null;
}
