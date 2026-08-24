import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { fetchClubSurfaceAccount } from "@/modules/shell/infrastructure/accountRepository";
import { fetchManagedMatches } from "@/modules/matches/infrastructure/matchRepository";
import { fetchTournamentById } from "@/modules/tournaments/infrastructure/tournamentRepository";
import { fetchClubCourts } from "@/modules/courts/infrastructure/courtRepository";
import { MatchList } from "@/modules/matches/ui/match-list";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Partidos — Padel Platform" };

export default async function PartidosPage() {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const account = await fetchClubSurfaceAccount(context.userId);
  if (!account) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Partidos</h1>
        </div>
        <EmptyState
          icon={CalendarBlank}
          title="Esta cuenta no tiene club u organizador propio"
          description="Iniciá sesión con una cuenta Club u Organizador para ver y cargar resultados de partidos."
        />
      </div>
    );
  }

  const matches = await fetchManagedMatches(account);

  const tournamentIds = [...new Set(matches.map((m) => m.tournamentId))];
  const tournaments = await Promise.all(tournamentIds.map((id) => fetchTournamentById(id)));
  const clubIdByTournamentId = new Map(tournaments.filter((t) => t !== null).map((t) => [t!.id, t!.clubId]));

  const clubIds = [...new Set([...clubIdByTournamentId.values()])];
  const courtsByClubId = new Map(await Promise.all(clubIds.map(async (id) => [id, await fetchClubCourts(id)] as const)));

  const courtsByTournamentId: Record<string, { id: string; name: string }[]> = {};
  for (const tournamentId of tournamentIds) {
    const clubId = clubIdByTournamentId.get(tournamentId);
    const courts = (clubId ? courtsByClubId.get(clubId) : []) ?? [];
    courtsByTournamentId[tournamentId] = courts.filter((c) => c.status === "AVAILABLE").map((c) => ({ id: c.id, name: c.name }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Partidos</h1>
        <p className="text-sm text-muted-foreground">En vivo y por jugar, de todos tus torneos.</p>
      </div>
      <MatchList matches={matches} courtsByTournamentId={courtsByTournamentId} showTournamentName={tournamentIds.length > 1} />
    </div>
  );
}
