import { NextRequest, NextResponse } from "next/server";
import { adminFetch } from "@/lib/api";
import { requireAccess } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
  const access = await requireAccess();
  if (access instanceof NextResponse) return access;
  if (access.role !== "agencia") {
    return NextResponse.json({ detail: "Solo agencia puede crear clinicas" }, { status: 403 });
  }

  const body = await req.json();
  const res = await adminFetch("/admin/clinicas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    noStore: true,
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
}
