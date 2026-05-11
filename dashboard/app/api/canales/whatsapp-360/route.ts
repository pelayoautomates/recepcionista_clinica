import { adminFetch } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";
import { enforceClinicScope, requireAccess } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  const access = await requireAccess();
  if (access instanceof NextResponse) return access;

  const body = await req.json();
  const { clinic_id, dialog360_api_key, dialog360_phone_id, dialog360_waba_id } = body;

  if (!clinic_id || !dialog360_api_key || !dialog360_phone_id) {
    return NextResponse.json({ detail: "Faltan clinic_id, dialog360_api_key o dialog360_phone_id" }, { status: 400 });
  }
  const scopeError = enforceClinicScope(access, clinic_id);
  if (scopeError) return scopeError;

  const res = await adminFetch(`/admin/clinicas/${clinic_id}/canales/360dialog`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dialog360_api_key, dialog360_phone_id, dialog360_waba_id }),
  });
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: { "Content-Type": "application/json" } });
}

export async function DELETE(req: NextRequest) {
  const access = await requireAccess();
  if (access instanceof NextResponse) return access;

  const body = await req.json();
  const { clinic_id } = body;
  if (!clinic_id) return NextResponse.json({ detail: "Falta clinic_id" }, { status: 400 });

  const scopeError = enforceClinicScope(access, clinic_id);
  if (scopeError) return scopeError;

  const res = await adminFetch(`/admin/clinicas/${clinic_id}/canales/360dialog`, { method: "DELETE" });
  return new NextResponse(null, { status: res.status });
}
