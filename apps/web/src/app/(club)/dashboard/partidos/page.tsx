import type { Metadata } from "next";
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { getClubCourts, getOrganizerMatchCards } from "@/modules/matches/application/getMatches";
import { MatchLiveGrid } from "@/modules/matches/ui/match-live-grid";
import { EmptyState } from "@/components/ui/empty-state";
import type { CourtOption } from "@/modules/matches/infrastructure/matchRepository";

export const metadata: Metadata = { title: "Partidos — Padel Platform" };

export default async function ClubMatchesPage() {
  const matches = await getOrganizerMatchCards();

  const clubIds = [...new Set(matches.map((m) => m.clubId).filter((id): id is string => id !== null))];
  const courtsByClubEntries = await Promise.all(
    clubIds.map(async (clubId): Promise<[string, CourtOption[]]> => [clubId, await getClubCourts(clubId)])
  );
  const courtsByClub = Object.fromEntries(courtsByClubEntries);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Partidos</h1>

      {matches.length === 0 ? (
        <EmptyState
          icon={CalendarBlank}
          title="Todavía no hay partidos"
          description="Los partidos aparecen aquí una vez que un torneo genera su cuadro."
        />
      ) : (
        <MatchLiveGrid matches={matches} courtsByClub={courtsByClub} />
      )}
    </div>
  );
}
