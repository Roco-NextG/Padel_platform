import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { roleLabel } from "@/modules/auth/domain/roles";
import { signOutAction } from "@/modules/auth/application/actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Bienvenida — Padel Platform" };

export default async function BienvenidaPage() {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const role = context.roles[0]?.role;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Tu cuenta está lista</h1>
        <p className="text-sm text-muted-foreground">
          {role
            ? `Tu cuenta de ${roleLabel(role)} (${context.email}) ya está activa.`
            : `Tu cuenta (${context.email}) ya está activa.`}{" "}
          El panel completo todavía está en construcción — pronto vas a poder gestionar tus torneos
          desde acá.
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
