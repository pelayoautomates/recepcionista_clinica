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
  if (access.role !== "clinica") {
    return NextResponse.json({ detail: "Sin acceso" }, { status: 403 });
  }
  if (!access.clinicId || access.clinicId !== clinicId) {
    return NextResponse.json({ detail: "Sin acceso a esta clinica" }, { status: 403 });
  }
  return null;
}
