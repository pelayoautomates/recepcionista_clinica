import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/api";
import { requireAccess } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  const access = await requireAccess();
  if (access instanceof NextResponse) return access;

  const clinic_id = access.clinicId;

  const res = await adminFetch("/billing/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clinic_id }),
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
}
