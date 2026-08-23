import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { fetchClubSurfaceAccount } from "@/modules/shell/infrastructure/accountRepository";
import { fetchClubHostOptions } from "@/modules/courts/infrastructure/courtRepository";
import { CreateTournamentForm } from "@/modules/tournaments/ui/create-tournament-form";

export const metadata: Metadata = { title: "Nuevo torneo — Padel Platform" };

export default async function NuevoTorneoPage() {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const account = await fetchClubSurfaceAccount(context.userId);
  if (!account) redirect("/dashboard/torneos");

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
