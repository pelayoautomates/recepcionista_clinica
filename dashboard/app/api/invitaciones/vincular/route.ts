import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminFetch } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const throttle = enforceRateLimit(req, "invitacion-vincular", 20, 60_000);
  if (throttle) return throttle;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ detail: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  if (body?.user_id !== user.id || body?.email !== user.email) {
    return NextResponse.json({ detail: "Usuario no coincide con la sesion" }, { status: 403 });
  }

  const res = await adminFetch("/admin/invitaciones/vincular", {
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
