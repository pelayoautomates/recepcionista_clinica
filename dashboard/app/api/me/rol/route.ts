import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/auth-utils";

export async function GET() {
  const access = await requireAccess();
  if (access instanceof NextResponse) return access;

  return NextResponse.json({
    rol: access.role,
    clinic_id: access.clinicId,
  });
}
