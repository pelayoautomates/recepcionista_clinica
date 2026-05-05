import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";
const AGENCY_EMAIL = process.env.NEXT_PUBLIC_AGENCY_EMAIL || "";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token = searchParams.get("token");

  if (!code) return NextResponse.redirect(`${origin}/login`);

  // Create response first so we can attach cookies to it
  const response = NextResponse.redirect(`${origin}/`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const user = data.user;

  if (token) {
    await fetch(`${BACKEND}/admin/invitaciones/vincular`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, user_id: user.id, email: user.email }),
    });
    response.headers.set("location", `${origin}/panel`);
    return response;
  }

  if (user.email === AGENCY_EMAIL) {
    await fetch(`${BACKEND}/me/rol?user_id=${user.id}&email=${user.email}`);
    return response; // ya apunta a /
  }

  const rolRes = await fetch(`${BACKEND}/me/rol?user_id=${user.id}&email=${user.email}`);
  const rolData = await rolRes.json();

  if (rolData.rol === "clinica") {
    response.headers.set("location", `${origin}/panel`);
    return response;
  }
  if (rolData.rol === "agencia") {
    return response;
  }

  return NextResponse.redirect(`${origin}/login?error=sin_acceso`);
}
