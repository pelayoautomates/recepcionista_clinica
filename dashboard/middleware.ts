import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_AGENCY_EMAIL = "pelayo.automates@gmail.com";
const AGENCY_EMAILS = (process.env.AGENCY_EMAIL || process.env.NEXT_PUBLIC_AGENCY_EMAIL || DEFAULT_AGENCY_EMAIL)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

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
  const userEmail = (user?.email || "").trim().toLowerCase();
  const esAgencia = AGENCY_EMAILS.includes(userEmail);

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
  if (esRutaAgencia && !esAgencia) {
    return NextResponse.redirect(new URL("/panel", request.url));
  }

  // Rutas de clínica (/panel/*) → cualquier usuario autenticado menos la agencia
  const esRutaClinica = path.startsWith("/panel");
  if (esRutaClinica && esAgencia) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
