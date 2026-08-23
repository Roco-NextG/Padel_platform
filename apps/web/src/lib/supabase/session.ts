import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

const AUTH_PATHS = ["/login"];

/**
 * Rutas del flujo de invitación — a diferencia de AUTH_PATHS, ni exigen
 * sesión previa (el callback recién la crea) ni redirigen si el visitante
 * SÍ está logueado; este flujo maneja su propio estado de sesión.
 */
const INVITE_PATHS = ["/invitacion", "/auth/callback", "/bienvenida"];

/**
 * Refreshes the Supabase session on every request (required by @supabase/ssr
 * so server components see a valid token) and gates the routes that require
 * a session. Role-specific gating (admin vs. club vs. organizador) happens
 * in the relevant layout server components, not here — that needs a DB read
 * this middleware intentionally avoids doing on every request.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPath = AUTH_PATHS.some((path) => pathname.startsWith(path));
  const isInvitePath = INVITE_PATHS.some((path) => pathname.startsWith(path));

  if (isInvitePath) {
    return response;
  }

  if (!user && !isAuthPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Si /login trae authError (ej. invite_expired desde /auth/callback), no
  // rebotamos a un usuario ya logueado sin mostrárselo primero — antes esto
  // mandaba a cualquiera que probara un link de invitación desde una
  // sesión ya activa (el caso típico: el propio admin probando sus propias
  // invitaciones) directo a /admin sin ver el mensaje real, indistinguible
  // de "el link me llevó al panel de admin".
  if (user && isAuthPath && !request.nextUrl.searchParams.has("authError")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
