import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";
const AGENCY_EMAIL = process.env.NEXT_PUBLIC_AGENCY_EMAIL || "";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token = searchParams.get("token"); // token de invitación de clínica

  if (!code) return NextResponse.redirect(`${origin}/login`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const user = data.user;

  // Si viene con token de invitación → vincular usuario a la clínica
  if (token) {
    await fetch(`${BACKEND}/admin/invitaciones/vincular`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, user_id: user.id, email: user.email }),
    });
    return NextResponse.redirect(`${origin}/panel`);
  }

  // Si es el email de la agencia → panel de agencia
  if (user.email === AGENCY_EMAIL) {
    // Auto-registrar como admin si no lo está
    await fetch(`${BACKEND}/me/rol?user_id=${user.id}&email=${user.email}`);
    return NextResponse.redirect(`${origin}/`);
  }

  // Comprobar si ya tiene clínica vinculada
  const rolRes = await fetch(`${BACKEND}/me/rol?user_id=${user.id}&email=${user.email}`);
  const rolData = await rolRes.json();

  if (rolData.rol === "clinica") return NextResponse.redirect(`${origin}/panel`);
  if (rolData.rol === "agencia") return NextResponse.redirect(`${origin}/`);

  // Sin rol → no tiene acceso
  return NextResponse.redirect(`${origin}/login?error=sin_acceso`);
}
