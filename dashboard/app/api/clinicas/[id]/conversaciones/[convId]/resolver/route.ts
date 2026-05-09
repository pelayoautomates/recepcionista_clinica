import { NextResponse } from "next/server";
import { adminFetch } from "@/lib/api";
import { enforceClinicScope, requireAccess } from "@/lib/auth-utils";

export async function PATCH(
  _: Request,
  { params }: { params: Promise<{ id: string; convId: string }> }
) {
  const access = await requireAccess();
  if (access instanceof NextResponse) return access;

  const { id, convId } = await params;
  const scopeError = enforceClinicScope(access, id);
  if (scopeError) return scopeError;

  const res = await adminFetch(`/admin/clinicas/${id}/conversaciones/${convId}/resolver`, {
    method: "PATCH",
    noStore: true,
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
}
