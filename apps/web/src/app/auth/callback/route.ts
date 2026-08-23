import { NextResponse, type NextRequest } from "next/server";

/**
 * Este link es el que va DENTRO del correo de invitación — eso significa
 * que un GET acá no siempre es el click humano. Gmail/Outlook (Safe Links)
 * y varios antivirus corporativos pre-visitan (GET) cada link de un email
 * para escanearlo por phishing, ANTES de que el usuario lo abra. El `code`
 * de Supabase es de un solo uso: si este handler lo canjeaba acá mismo
 * (como hacía antes), el scanner se lo comía primero y el click real del
 * usuario caía siempre en "vencido o ya usado" — el propio bug reportado.
 *
 * Fix: este GET ya NO canjea nada, solo redirige a una pantalla que pide un
 * click humano real (botón) antes de canjear el code — ver
 * app/(auth)/invitacion/confirmar/page.tsx + confirmInviteAction. Un
 * scanner automatizado nunca hace ese click, así que el code sigue intacto
 * para cuando el usuario sí lo hace.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const confirmUrl = new URL("/invitacion/confirmar", origin);
    confirmUrl.searchParams.set("code", code);
    confirmUrl.searchParams.set("next", next);
    return NextResponse.redirect(confirmUrl);
  }

  // Sin `code` — Supabase mandó el error como fragmento #error=... (el
  // servidor nunca lo ve) o el link ya no es válido por otra razón.
  return NextResponse.redirect(`${origin}/login?authError=invite_expired`);
}
