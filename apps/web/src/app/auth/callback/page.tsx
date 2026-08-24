"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleNotch } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { ConfirmInviteForm } from "@/modules/invites/ui/confirm-invite-form";

/**
 * El link real que manda Supabase para invitaciones es el suyo propio,
 * hosteado (`{SUPABASE_URL}/auth/v1/verify?token=...&type=invite&
 * redirect_to=...`), NO un link directo a esta app — confirmado leyendo el
 * link real de un correo de invitación. Ese endpoint de Supabase consume el
 * token del lado de ellos y redirige acá con la sesión codificada en el
 * FRAGMENTO de la URL (#access_token=...&refresh_token=...&type=invite en
 * éxito, #error=...&error_code=... en falla) — nunca con ?code= en el query
 * string. Un fragmento jamás llega al servidor (el navegador no lo manda en
 * el HTTP request), así que el viejo route.ts (Route Handler, solo server)
 * NUNCA pudo leerlo — por eso el link siempre terminaba en "vencido o ya
 * usado" sin importar si el token era válido. Esto explica el bug desde el
 * reporte original de esta sesión, no solo el error de pre-fetch de
 * scanners de email que se sospechaba antes.
 *
 * Esta página ahora sí lo lee (solo posible client-side, con JS) y llama
 * supabase.auth.setSession() directo — sin pedir un click extra, porque un
 * fragmento YA es inherentemente a prueba de scanners de email (ningún
 * crawler de seguridad ejecuta JS ni parsea el fragmento).
 *
 * Si en cambio llega un ?code= por query string (flujo PKCE, algún día
 * quizás), esta misma página muestra el botón de confirmación en vez de
 * procesar solo — ese caso sí es vulnerable al pre-fetch porque el código
 * viaja en la URL que el servidor puede leer.
 */
function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <CircleNotch className="size-6 animate-spin text-muted-foreground" weight="bold" />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AuthCallbackHandler />
    </Suspense>
  );
}

function AuthCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  useEffect(() => {
    // El caso ?code= lo maneja el render de abajo (botón de confirmación,
    // ver el comentario de arriba) — este effect solo procesa el fragmento.
    if (code) return;

    const next = searchParams.get("next") ?? "/invitacion";
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (hash.get("error")) {
      router.replace("/login?authError=invite_expired");
      return;
    }

    if (accessToken && refreshToken) {
      const supabase = createClient();
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
        router.replace(error ? "/login?authError=invite_expired" : next);
      });
      return;
    }

    router.replace("/login?authError=invite_expired");
  }, [code, router, searchParams]);

  if (code) {
    const next = searchParams.get("next") ?? "/invitacion";
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Aceptar invitación</h1>
            <p className="text-sm text-muted-foreground">Tocá el botón para activar tu cuenta.</p>
          </div>
          <ConfirmInviteForm code={code} next={next} />
        </div>
      </div>
    );
  }

  return <LoadingSpinner />;
}
