import { adminFetch } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";
import { enforceClinicScope, requireAccess } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  const access = await requireAccess();
  if (access instanceof NextResponse) return access;

  const body = await req.json();
  const { clinic_id, code, waba_id, phone_number_id } = body;

  if (!clinic_id || !code) {
    return NextResponse.json({ detail: "Faltan clinic_id o code" }, { status: 400 });
  }

  const scopeError = enforceClinicScope(access, clinic_id);
  if (scopeError) return scopeError;

  const res = await adminFetch(`/admin/clinicas/${clinic_id}/canales/whatsapp/meta`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, waba_id, phone_number_id }),
  });
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: { "Content-Type": "application/json" } });
}

export async function DELETE(req: NextRequest) {
  const access = await requireAccess();
  if (access instanceof NextResponse) return access;

  const body = await req.json();
  const { clinic_id } = body;

  if (!clinic_id) {
    return NextResponse.json({ detail: "Falta clinic_id" }, { status: 400 });
  }

  const scopeError = enforceClinicScope(access, clinic_id);
  if (scopeError) return scopeError;

  const res = await adminFetch(`/admin/clinicas/${clinic_id}/canales/whatsapp/meta`, {
    method: "DELETE",
  });
  const data = await res.text();
  return new NextResponse(data, { status: res.status, headers: { "Content-Type": "application/json" } });
}
