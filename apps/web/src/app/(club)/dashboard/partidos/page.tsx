import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { fetchClubSurfaceAccount } from "@/modules/shell/infrastructure/accountRepository";
import { fetchManagedMatches, fetchMatchesForTournament } from "@/modules/matches/infrastructure/matchRepository";
import { fetchMyTournaments, fetchTournamentById } from "@/modules/tournaments/infrastructure/tournamentRepository";
import { fetchClubCourts } from "@/modules/courts/infrastructure/courtRepository";
import { MatchList } from "@/modules/matches/ui/match-list";
import { SchedulerBoardLoader } from "@/modules/matches/ui/scheduler-board-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarBlank, Radio, CalendarDots } from "@phosphor-icons/react/dist/ssr";
import { todayZonedDateKey } from "@/lib/timezone";

export const metadata: Metadata = { title: "Partidos — Padel Platform" };

export default async function PartidosPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; torneo?: string }>;
}) {
  const { vista, torneo } = await searchParams;
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

  const torneoParam = torneo ? `&torneo=${torneo}` : "";

  const viewSwitch = (
    <div className="flex gap-1 rounded-full border border-border-strong bg-surface p-1">
      <Link
        href={`/dashboard/partidos?vista=live${torneoParam}`}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
          vista !== "plan" ? "bg-accent-muted text-accent-text" : "text-muted-foreground hover:bg-surface-secondary"
        }`}
      >
        <Radio className="size-3.5" />
        En vivo
      </Link>
      <Link
        href={`/dashboard/partidos?vista=plan${torneoParam}`}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
          vista === "plan" ? "bg-accent-muted text-accent-text" : "text-muted-foreground hover:bg-surface-secondary"
        }`}
      >
        <CalendarDots className="size-3.5" />
        Planificación
      </Link>
    </div>
  );

  if (vista === "plan") {
    const tournaments = await fetchMyTournaments(account);
    if (tournaments.length === 0) {
      return (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Partidos</h1>
              <p className="text-sm text-muted-foreground">Planificación de horarios.</p>
            </div>
            {viewSwitch}
          </div>
          <EmptyState icon={CalendarDots} title="Todavía no tenés torneos" description="Creá un torneo para poder planificar sus partidos." />
        </div>
      );
    }

    const selectedTournament = tournaments.find((t) => t.id === torneo) ?? tournaments[0];
    const [matches, courts] = await Promise.all([
      fetchMatchesForTournament(selectedTournament.id),
      fetchClubCourts(selectedTournament.clubId),
    ]);
    const availableCourts = courts.filter((c) => c.status === "AVAILABLE").map((c) => ({ id: c.id, name: c.name }));
    const initialDate = selectedTournament.startDate ?? todayZonedDateKey();

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Partidos</h1>
            <p className="text-sm text-muted-foreground">{selectedTournament.name}</p>
          </div>
          {viewSwitch}
        </div>
        {tournaments.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/partidos?vista=plan&torneo=${t.id}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  t.id === selectedTournament.id
                    ? "border-accent bg-accent-muted text-accent-text"
                    : "border-border-strong text-muted-foreground hover:bg-surface-secondary"
                }`}
              >
                {t.name}
              </Link>
            ))}
          </div>
        )}
        <SchedulerBoardLoader tournamentId={selectedTournament.id} matches={matches} courts={availableCourts} initialDate={initialDate} />
      </div>
    );
  }

  const matches = await fetchManagedMatches(account);

  const tournamentIds = [...new Set(matches.map((m) => m.tournamentId))];
  const tournamentsForMatches = await Promise.all(tournamentIds.map((id) => fetchTournamentById(id)));
  const clubIdByTournamentId = new Map(tournamentsForMatches.filter((t) => t !== null).map((t) => [t!.id, t!.clubId]));

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Partidos</h1>
          <p className="text-sm text-muted-foreground">En vivo y por jugar, de todos tus torneos.</p>
        </div>
        {viewSwitch}
      </div>
      <MatchList matches={matches} courtsByTournamentId={courtsByTournamentId} showTournamentName={tournamentIds.length > 1} />
    </div>
  );
}
