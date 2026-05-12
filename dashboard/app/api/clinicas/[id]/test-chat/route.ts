import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/api";
import { enforceClinicScope, requireAccess } from "@/lib/auth-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const scopeError = enforceClinicScope(access, id);
  if (scopeError) return scopeError;

  const body = await req.json();
  const res = await adminFetch(`/admin/clinicas/${id}/test-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    noStore: true,
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
