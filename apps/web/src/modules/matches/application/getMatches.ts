import {
  fetchMatchConfirmations,
  fetchMatchWithContext,
  fetchOrganizerMatches,
  fetchPendingConfirmationsForPlayer,
  fetchUpcomingMatchForPlayer,
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

export async function getPendingConfirmationsForPlayer(playerId: string): Promise<MatchWithContext[]> {
  return fetchPendingConfirmationsForPlayer(playerId);
}

export async function getUpcomingMatchForPlayer(playerId: string): Promise<MatchWithContext | null> {
  return fetchUpcomingMatchForPlayer(playerId);
}
