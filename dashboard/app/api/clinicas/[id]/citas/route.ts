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

  const incoming = new URL(req.url).searchParams;
  const query = new URLSearchParams();
  ["fecha", "fecha_inicio", "fecha_fin"].forEach((key) => {
    const value = incoming.get(key);
    if (value) query.set(key, value);
  });

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const res = await adminFetch(`/admin/clinicas/${id}/citas${suffix}`, { noStore: true });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
}
