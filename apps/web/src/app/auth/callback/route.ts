import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Genérico: intercambia el `code` que manda Supabase (invite, magic link, OAuth) por una sesión y sigue a `next`. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Sin `code` (Supabase mandó el error como fragmento #error=... en vez de
  // ?code=..., que el servidor nunca ve) o el exchange falló — el caso
  // típico es un link de invitación vencido o ya usado (a veces por el
  // pre-fetch de seguridad de Gmail consumiendo el link antes del click
  // humano). authError=invite_expired le da a /login un mensaje claro en
  // vez de un bounce mudo.
  return NextResponse.redirect(`${origin}/login?authError=invite_expired`);
}
