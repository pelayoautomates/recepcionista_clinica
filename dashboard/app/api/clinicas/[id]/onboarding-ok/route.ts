import { adminFetch } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";
import { enforceClinicScope, requireAccess } from "@/lib/auth-utils";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAccess();
  if (access instanceof NextResponse) return access;

  const { id } = await params;
  const scopeError = enforceClinicScope(access, id);
  if (scopeError) return scopeError;

  const res = await adminFetch(`/admin/clinicas/${id}/onboarding-ok`, { method: "POST" });
  const data = await res.json().catch(() => ({ ok: true }));
  return NextResponse.json(data, { status: res.status });
}
