import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas completamente públicas (sin sesión)
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/landing",
  "/pricing",
  "/demo",
  "/seguridad",
  "/integraciones",
  "/sobre-atiende360",
  "/comparativa/chatbot-generico",
  "/privacidad",
  "/terminos",
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/opengraph-image",
];
const PUBLIC_PREFIXES = ["/auth", "/api", "/widget", "/blog"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const path = request.nextUrl.pathname;

  // Rutas públicas — pasan sin comprobación
  if (
    PUBLIC_PATHS.includes(path) ||
    PUBLIC_PREFIXES.some((p) => path.startsWith(p))
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Sin sesión → login
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // /onboarding → requiere auth, no necesita clínica
  if (path.startsWith("/onboarding")) {
    return response;
  }

  // /suscripcion → requiere auth
  if (path.startsWith("/suscripcion")) {
    return response;
  }

  // /panel → requiere auth (el layout verifica clínica y trial)
  if (path.startsWith("/panel")) {
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
