import { adminFetch } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";
import { enforceClinicScope, requireAccess } from "@/lib/auth-utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAccess();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const scopeError = enforceClinicScope(access, id);
  if (scopeError) return scopeError;

  const body = await req.json();
  const res = await adminFetch(`/admin/clinicas/${id}/configuracion/guardar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
