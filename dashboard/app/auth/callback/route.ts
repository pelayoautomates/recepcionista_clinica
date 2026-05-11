import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token = searchParams.get("token");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const response = NextResponse.redirect(`${origin}/panel`);

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

  // Comprobar si el usuario ya tiene clínica vinculada
  try {
    const rolRes = await fetch(
      `${BACKEND}/admin/me/rol?user_id=${user.id}&email=${encodeURIComponent(user.email ?? "")}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (rolRes.ok) {
      const rolData = await rolRes.json();
      if (rolData.rol === "clinica") {
        // Trial expirado → suscripción
        if (rolData.trial_expires_at && rolData.plan === "trial") {
          const expires = new Date(rolData.trial_expires_at);
          if (expires < new Date()) {
            response.headers.set("location", `${origin}/suscripcion`);
            return response;
          }
        }
        response.headers.set("location", `${origin}/panel`);
        return response;
      }
    }
  } catch {}

  // Sin clínica → onboarding (con token de invitación si existe)
  const onboardingUrl = token
    ? `${origin}/onboarding?token=${encodeURIComponent(token)}`
    : `${origin}/onboarding`;
  response.headers.set("location", onboardingUrl);
  return response;
}
