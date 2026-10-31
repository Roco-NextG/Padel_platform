import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { isAdmin, roleLabel } from "@/modules/auth/domain/roles";
import { signOutAction } from "@/modules/auth/application/actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Bienvenida — DeuceUp" };

export default async function BienvenidaPage() {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const role = context.roles[0]?.role;

  return (
    <div className="flex flex-col gap-6">
      {isAdmin(context.roles) && (
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-accent-text hover:underline"
        >
          <ArrowSquareOut className="size-4" />
          Ir al panel de admin
        </Link>
      )}

      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Tu cuenta está lista</h1>
        <p className="text-sm text-muted-foreground">
          {role
            ? `Tu cuenta de ${roleLabel(role)} (${context.email}) ya está activa.`
            : `Tu cuenta (${context.email}) ya está activa.`}{" "}
          {/* Club/Organizador/Admin ahora van directo a su panel (homePathForRoles,
              ver invites/application/actions.ts) — quien llega acá es siempre un
              Jugador, que todavía no tiene panel propio, así que el mensaje es real
              para esta audiencia (antes decía esto para TODOS, incluido Club/
              Organizador con el panel ya completo, lo cual era falso). */}
          Todavía no tenés un panel propio como jugador — tu club u organizador gestiona tus
          torneos y partidos desde el suyo.
        </p>
      </div>
      <form action={signOutAction}>
        <Button type="submit" variant="secondary">
          Cerrar sesión
        </Button>
      </form>
    </div>
  );
}
