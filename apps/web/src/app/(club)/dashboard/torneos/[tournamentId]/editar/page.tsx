import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTournament } from "@/modules/tournaments/application/getTournaments";
import { fetchCategories } from "@/modules/tournaments/infrastructure/tournamentRepository";
import { TournamentStatusBadge } from "@/modules/tournaments/ui/tournament-status-badge";
import { CategoryGrid } from "@/modules/tournaments/ui/category-grid";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListChecks } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Editar torneo — Padel Platform" };

export default async function EditarTorneoPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;
  const tournament = await getTournament(tournamentId);
  if (!tournament) notFound();

  const categories = await fetchCategories(tournamentId);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tournament.name}</h1>
          <p className="text-sm text-muted-foreground">{tournament.clubName}</p>
        </div>
        <TournamentStatusBadge status={tournament.status} />
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">Categorías</h2>
          <p className="text-xs text-muted-foreground">
            Tocá una celda para activarla o desactivarla — nivel de juego × género.
          </p>
        </div>
        <Card>
          <CategoryGrid tournamentId={tournamentId} categories={categories} />
        </Card>
      </div>

      <EmptyState
        icon={ListChecks}
        title="Próximos pasos"
        description="Patrocinadores → Inscripciones → Publicar — cada paso se habilita a medida que se construye."
      />
    </div>
  );
}
