import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";
const AGENCY_EMAIL = process.env.NEXT_PUBLIC_AGENCY_EMAIL || "";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token = searchParams.get("token");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

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
    const msg = encodeURIComponent(error?.message || "unknown");
    return NextResponse.redirect(`${origin}/login?error=exchange_failed&msg=${msg}`);
  }

  const user = data.user;

  // Token de invitación → vincular y mandar al panel de clínica
  if (token) {
    try {
      const vinRes = await fetch(`${BACKEND}/admin/invitaciones/vincular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, user_id: user.id, email: user.email }),
        signal: AbortSignal.timeout(5000),
      });
      if (!vinRes.ok) {
        response.headers.set("location", `${origin}/login?error=invitacion_invalida`);
        return response;
      }
    } catch {
      response.headers.set("location", `${origin}/login?error=backend_timeout`);
      return response;
    }
    response.headers.set("location", `${origin}/panel`);
    return response;
  }

  // Email de agencia → panel de agencia directamente (sin llamar al backend)
  if (user.email === AGENCY_EMAIL) {
    return response; // redirige a /
  }

  // Resto de usuarios → comprobar rol en backend
  try {
    const rolRes = await fetch(
      `${BACKEND}/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`,
      { signal: AbortSignal.timeout(5000) }
    );
    const rolData = await rolRes.json();
    if (rolData.rol === "clinica" || rolData.rol === "agencia") {
      const dest = rolData.rol === "clinica" ? "/panel" : "/";
      response.headers.set("location", `${origin}${dest}`);
    } else {
      response.headers.set("location", `${origin}/login?error=sin_acceso`);
    }
  } catch {
    response.headers.set("location", `${origin}/login?error=backend_timeout`);
  }

  return response;
}
