import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/api";
import { enforceClinicScope, requireAccess } from "@/lib/auth-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const scopeError = enforceClinicScope(access, id);
  if (scopeError) return scopeError;

  const dias = req.nextUrl.searchParams.get("dias") || "30";
  const res = await adminFetch(`/admin/clinicas/${id}/analytics?dias=${dias}`, {
    noStore: true,
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
}
