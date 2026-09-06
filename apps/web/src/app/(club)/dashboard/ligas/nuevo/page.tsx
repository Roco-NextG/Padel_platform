import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { fetchClubSurfaceAccount } from "@/modules/shell/infrastructure/accountRepository";
import { fetchClubHostOptions } from "@/modules/courts/infrastructure/courtRepository";
import { CreateLeagueForm } from "@/modules/leagues/ui/create-league-form";
import { EmptyState } from "@/components/ui/empty-state";
import { UserCircleMinus } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Nueva liga — Padel Platform" };

export default async function NuevaLigaPage() {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const account = await fetchClubSurfaceAccount(context.userId);

  if (!account) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nueva liga</h1>
        </div>
        <EmptyState
          icon={UserCircleMinus}
          title="Esta cuenta no tiene club u organizador propio"
          description="Iniciaste sesión con tu cuenta de administrador, que no está vinculada a ningún club ni organizador. Iniciá sesión con una cuenta Club u Organizador para crear ligas."
        />
      </div>
    );
  }

  const isOrganizador = account.role === "Organizador";
  const hostOptions = isOrganizador ? await fetchClubHostOptions() : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva liga</h1>
        <p className="text-sm text-muted-foreground">Datos básicos — después vas a poder sumar categorías e inscripciones.</p>
      </div>
      <CreateLeagueForm isOrganizador={isOrganizador} hostOptions={hostOptions} />
    </div>
  );
}
