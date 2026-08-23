import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { fetchClubSurfaceAccount } from "@/modules/shell/infrastructure/accountRepository";
import { fetchClubHostOptions } from "@/modules/courts/infrastructure/courtRepository";
import { CreateTournamentForm } from "@/modules/tournaments/ui/create-tournament-form";
import { EmptyState } from "@/components/ui/empty-state";
import { UserCircleMinus } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Nuevo torneo — Padel Platform" };

export default async function NuevoTorneoPage() {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const account = await fetchClubSurfaceAccount(context.userId);

  if (!account) {
    // Un admin puro (sin fila CLUB/ORGANIZADOR propia en role_assignments)
    // puede entrar a esta superficie para inspeccionarla (belongsOnClubSurface
    // lo permite), pero no tiene club/organizador dueño para asignarle al
    // torneo — antes esto redirigía en silencio a /torneos, indistinguible
    // de "no pasó nada" al hacer click. Mostramos el motivo en vez de rebotar.
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nuevo torneo</h1>
        </div>
        <EmptyState
          icon={UserCircleMinus}
          title="Esta cuenta no tiene club u organizador propio"
          description="Iniciaste sesión con tu cuenta de administrador, que no está vinculada a ningún club ni organizador. Iniciá sesión con una cuenta Club u Organizador para crear torneos."
        />
      </div>
    );
  }

  const isOrganizador = account.role === "Organizador";
  const hostOptions = isOrganizador ? await fetchClubHostOptions() : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo torneo</h1>
        <p className="text-sm text-muted-foreground">Datos básicos — después vas a poder sumar categorías, patrocinadores e inscripciones.</p>
      </div>
      <CreateTournamentForm isOrganizador={isOrganizador} hostOptions={hostOptions} />
    </div>
  );
}
