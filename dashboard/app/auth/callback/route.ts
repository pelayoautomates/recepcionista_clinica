import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const AGENCY_EMAIL = process.env.NEXT_PUBLIC_AGENCY_EMAIL || "";
const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const response = NextResponse.redirect(`${origin}/`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
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
    const msg = encodeURIComponent(error?.message || "unknown");
    return NextResponse.redirect(`${origin}/login?error=exchange_failed&msg=${msg}`);
  }

  const user = data.user;

  // Agencia → panel de agencia
  if (user.email === AGENCY_EMAIL) {
    response.headers.set("location", `${origin}/`);
    return response;
  }

  // Comprobar si ya está vinculado a una clínica
  try {
    const rolRes = await fetch(
      `${BACKEND}/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (rolRes.ok) {
      const rolData = await rolRes.json();
      if (rolData.rol === "clinica") {
        response.headers.set("location", `${origin}/panel`);
        return response;
      }
    }
  } catch {}

  // No vinculado → página de completar (maneja el token de invitación client-side)
  response.headers.set("location", `${origin}/auth/completing`);
  return response;
}
