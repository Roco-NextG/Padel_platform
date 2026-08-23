import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTournament } from "@/modules/tournaments/application/getTournaments";
import { TournamentStatusBadge } from "@/modules/tournaments/ui/tournament-status-badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListChecks } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Editar torneo — Padel Platform" };

export default async function EditarTorneoPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const tournament = await getTournament(tournamentId);
  if (!tournament) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tournament.name}</h1>
          <p className="text-sm text-muted-foreground">{tournament.clubName}</p>
        </div>
        <TournamentStatusBadge status={tournament.status} />
      </div>

      <Card className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Torneo creado</span>
        <p className="text-sm text-foreground">
          Los datos básicos están guardados. El resto del asistente (patrocinadores, categorías, inscripción de
          parejas y publicación) se conecta en la próxima etapa.
        </p>
      </Card>

      <EmptyState
        icon={ListChecks}
        title="Próximos pasos"
        description="Patrocinadores → Categorías → Inscripciones → Publicar — cada paso se habilita a medida que se construye."
      />
    </div>
  );
}
