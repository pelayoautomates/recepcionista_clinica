import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/api";
import { enforceClinicScope, requireAccess } from "@/lib/auth-utils";

type Ctx = { params: Promise<{ id: string; entradaId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const access = await requireAccess();
  if (access instanceof NextResponse) return access;
  const { id, entradaId } = await params;
  const scopeError = enforceClinicScope(access, id);
  if (scopeError) return scopeError;

  const body = await req.json();
  const res = await adminFetch(`/admin/clinicas/${id}/conocimiento/${entradaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const access = await requireAccess();
  if (access instanceof NextResponse) return access;
  const { id, entradaId } = await params;
  const scopeError = enforceClinicScope(access, id);
  if (scopeError) return scopeError;

  const res = await adminFetch(`/admin/clinicas/${id}/conocimiento/${entradaId}`, {
    method: "DELETE",
  });
  return new NextResponse(null, { status: res.status });
}
