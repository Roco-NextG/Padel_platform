import {
  fetchLiveAndUpcomingMatches,
  fetchSponsors,
  type SponsorRow,
  type TournamentLiveMatch,
} from "../infrastructure/tournamentRepository";

export interface TournamentOverview {
  liveMatches: TournamentLiveMatch[];
  upcomingMatches: TournamentLiveMatch[];
  sponsors: SponsorRow[];
}

/** Franja "en vivo / próximos" + patrocinadores del torneo (redesign/torneo-bracket) — capa de lectura nueva, no toca fetchBracketForCategory/getGroupStandingsForCategory. */
export async function getTournamentOverview(tournamentId: string): Promise<TournamentOverview> {
  const [matches, sponsors] = await Promise.all([
    fetchLiveAndUpcomingMatches(tournamentId),
    fetchSponsors(tournamentId),
  ]);

  return {
    liveMatches: matches.filter((m) => m.status === "IN_PROGRESS"),
    upcomingMatches: matches.filter((m) => m.status === "SCHEDULED"),
    sponsors,
  };
}
