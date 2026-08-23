import type { Metadata } from "next";
import { getMyTournaments } from "@/modules/tournaments/application/getTournaments";
import { TournamentCard, NewTournamentCard } from "@/modules/tournaments/ui/tournament-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Trophy } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Mis torneos — Padel Platform" };

export default async function MisTorneosPage() {
  const { account, tournaments } = await getMyTournaments();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mis torneos</h1>
        <p className="text-sm text-muted-foreground">
          {account ? `Los torneos que organiza ${account.name}.` : "Torneos"}
        </p>
      </div>

      {tournaments.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Todavía no creaste ningún torneo"
          description="Un torneo agrupa categorías, inscripciones, cuadro y partidos — empezá creando el primero."
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((t) => (
          <TournamentCard key={t.id} tournament={t} />
        ))}
        <NewTournamentCard />
      </div>
    </div>
  );
}
