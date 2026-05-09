import { NextResponse } from "next/server";
import { enforceClinicScope, requireAccess } from "@/lib/auth-utils";

const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const ADMIN_KEY = process.env.ADMIN_SECRET || "";

function backendHeaders(): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ADMIN_KEY) headers["X-Admin-Key"] = ADMIN_KEY;
  return headers;
}

async function proxy(method: "GET" | "POST" | "DELETE", clinicId: string) {
  const res = await fetch(`${BACKEND}/admin/clinicas/${clinicId}/invitacion`, {
    method,
    headers: backendHeaders(),
    cache: "no-store",
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireAccess();
    if (access instanceof NextResponse) return access;
    const scopeError = enforceClinicScope(access, id);
    if (scopeError) return scopeError;
    return await proxy("GET", id);
  } catch {
    return NextResponse.json({ detail: "Error consultando invitacion" }, { status: 500 });
  }
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireAccess();
    if (access instanceof NextResponse) return access;
    const scopeError = enforceClinicScope(access, id);
    if (scopeError) return scopeError;
    return await proxy("POST", id);
  } catch {
    return NextResponse.json({ detail: "Error creando invitacion" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await requireAccess();
    if (access instanceof NextResponse) return access;
    const scopeError = enforceClinicScope(access, id);
    if (scopeError) return scopeError;
    return await proxy("DELETE", id);
  } catch {
    return NextResponse.json({ detail: "Error regenerando invitacion" }, { status: 500 });
  }
}
