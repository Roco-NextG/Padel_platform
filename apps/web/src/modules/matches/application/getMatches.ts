import {
  fetchClubCourts,
  fetchMatchConfirmations,
  fetchMatchWithContext,
  fetchOrganizerMatches,
  fetchPendingConfirmationsForPlayer,
  fetchUpcomingMatchForPlayer,
  type CourtOption,
} from "../infrastructure/matchRepository";
import type { MatchConfirmationState, MatchWithContext } from "../domain/match";

export async function getMatchDetail(
  matchId: string
): Promise<{ match: MatchWithContext; confirmations: MatchConfirmationState[] } | null> {
  const match = await fetchMatchWithContext(matchId);
  if (!match) return null;

  const participantIds = [...match.teamA.players, ...match.teamB.players].map((p) => p.playerId);
  const confirmations = await fetchMatchConfirmations(matchId, participantIds);

  return { match, confirmations };
}

export async function getOrganizerMatchList() {
  return fetchOrganizerMatches();
}

/**
 * Versión enriquecida de getOrganizerMatchList() para el grid de cards de
 * /dashboard/partidos (redesign/partidos-vivo §1-2) — compone la misma
 * fetchOrganizerMatches() sin tocarla con fetchMatchWithContext() por cada
 * partido, para tener equipos/jugadores/sets sin duplicar esa lógica.
 */
export async function getOrganizerMatchCards(): Promise<MatchWithContext[]> {
  const rows = await fetchOrganizerMatches();
  const withContext = await Promise.all(rows.map((row) => fetchMatchWithContext(row.id)));
  return withContext.filter((m): m is MatchWithContext => m !== null);
}

export async function getClubCourts(clubId: string): Promise<CourtOption[]> {
  return fetchClubCourts(clubId);
}

export async function getPendingConfirmationsForPlayer(playerId: string): Promise<MatchWithContext[]> {
  return fetchPendingConfirmationsForPlayer(playerId);
}

export async function getUpcomingMatchForPlayer(playerId: string): Promise<MatchWithContext | null> {
  return fetchUpcomingMatchForPlayer(playerId);
}
