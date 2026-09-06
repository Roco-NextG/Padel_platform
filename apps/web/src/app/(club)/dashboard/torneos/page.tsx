import type { Metadata } from "next";
import { getMyTournaments } from "@/modules/tournaments/application/getTournaments";
import { getMyLeagues } from "@/modules/leagues/application/getLeagues";
import { TournamentCard, NewTournamentCard } from "@/modules/tournaments/ui/tournament-card";
import { LeagueCard, NewLeagueCard } from "@/modules/leagues/ui/league-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Trophy } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Mis torneos — Padel Platform" };

export default async function MisTorneosPage() {
  const [{ account, tournaments }, { leagues }] = await Promise.all([getMyTournaments(), getMyLeagues()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mis torneos</h1>
        <p className="text-sm text-muted-foreground">
          {account ? `Los torneos y ligas que organiza ${account.name}.` : "Torneos y ligas"}
        </p>
      </div>

      {tournaments.length === 0 && leagues.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Todavía no creaste ningún torneo ni liga"
          description="Un torneo agrupa categorías, inscripciones, cuadro y partidos — una liga agrupa categorías, inscripciones y jornadas. Empezá creando el primero."
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((t) => (
          <TournamentCard key={t.id} tournament={t} />
        ))}
        {leagues.map((l) => (
          <LeagueCard key={l.id} league={l} />
        ))}
        <NewTournamentCard />
        <NewLeagueCard />
      </div>
    </div>
  );
}
