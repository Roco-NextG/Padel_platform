import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWizardData } from "@/modules/tournaments/application/getWizardData";
import { TournamentWizard } from "@/modules/tournaments/ui/wizard/tournament-wizard";

export const metadata: Metadata = { title: "Crear torneo — Padel Platform" };

export default async function EditTournamentPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  const data = await getWizardData(tournamentId);
  if (!data) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Crear torneo</h1>
        <p className="text-sm text-muted-foreground">{data.tournament.name || "Torneo sin nombre"}</p>
      </div>
      <TournamentWizard data={data} />
    </div>
  );
}
