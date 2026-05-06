import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AGENCY_EMAIL = process.env.NEXT_PUBLIC_AGENCY_EMAIL || "";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

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
  const path = request.nextUrl.pathname;

  // Rutas públicas
  if (path.startsWith("/login") || path.startsWith("/auth")) {
    return response;
  }

  // Sin sesión → login
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Rutas de agencia (/ y /clinicas/*) → solo el email de agencia
  const esRutaAgencia = path === "/" || path.startsWith("/clinicas");
  if (esRutaAgencia && user.email !== AGENCY_EMAIL) {
    return NextResponse.redirect(new URL("/panel", request.url));
  }

  // Rutas de clínica (/panel/*) → cualquier usuario autenticado menos la agencia
  const esRutaClinica = path.startsWith("/panel");
  if (esRutaClinica && user.email === AGENCY_EMAIL) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
