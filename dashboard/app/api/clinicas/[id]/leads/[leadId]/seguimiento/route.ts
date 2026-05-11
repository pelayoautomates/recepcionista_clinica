import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/api";
import { enforceClinicScope, requireAccess } from "@/lib/auth-utils";

type Ctx = { params: Promise<{ id: string; leadId: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const access = await requireAccess();
  if (access instanceof NextResponse) return access;
  const { id, leadId } = await params;
  const scopeError = enforceClinicScope(access, id);
  if (scopeError) return scopeError;
  const res = await adminFetch(`/admin/clinicas/${id}/leads/${leadId}/seguimiento`, { method: "POST" });
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "Content-Type": "application/json" } });
}
