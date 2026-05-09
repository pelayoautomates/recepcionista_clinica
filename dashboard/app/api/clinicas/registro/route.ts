import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ detail: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();

  const res = await fetch(`${BACKEND}/saas/clinicas/registro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: user.id,
      email: user.email ?? "",
      nombre: body.nombre,
      especialidad: body.especialidad ?? null,
      url_web: body.url_web ?? null,
      telefono: body.telefono ?? null,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
  return NextResponse.json(data);
}
