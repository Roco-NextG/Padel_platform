"use server";

import { revalidatePath } from "next/cache";
import { validateMatchResult, type SetScoreInput, type TeamSide } from "@padel-platform/match-engine";
import { applyMatchResult, RATING_CONFIG, type MatchTypeForRating, type RatingMatchInput } from "@padel-platform/rating-engine";
import {
  fetchMatchRatingContext,
  recordRatingEvents,
  setMatchCourt,
  setMatchInProgress,
  submitResult,
} from "../infrastructure/matchRepository";
import { resolveScoringConfig } from "../domain/match";
import { requireTournamentManager } from "@/modules/tournaments/application/authGuard";
import { reconcileBracket } from "@/modules/tournaments/infrastructure/bracketRepository";
import type { ScoringConfigJson } from "@/lib/supabase/database.types";

export interface SimpleActionState {
  error: string | null;
}

function toRatingMatchType(dbType: "TOURNAMENT" | "COMPETITIVE" | "CASUAL"): MatchTypeForRating {
  return dbType === "COMPETITIVE" ? "COMPETITIVE" : "TOURNAMENT";
}

export async function submitMatchResultAction(
  tournamentId: string,
  matchId: string,
  scoringConfigJson: ScoringConfigJson,
  sets: SetScoreInput[],
  winner: TeamSide
): Promise<SimpleActionState> {
  const auth = await requireTournamentManager(tournamentId);
  if (!auth.ok) return { error: auth.error };

  const validation = validateMatchResult(sets, resolveScoringConfig(scoringConfigJson), winner);
  if (!validation.valid) return { error: validation.errors[0] };

  try {
    await submitResult(matchId, sets, winner);

    const context = await fetchMatchRatingContext(matchId);
    if (context && context.teamAPlayers.length === 2 && context.teamBPlayers.length === 2) {
      const gamesWonA = sets.reduce((sum, s) => sum + s.teamAGames, 0);
      const gamesWonB = sets.reduce((sum, s) => sum + s.teamBGames, 0);

      const input: RatingMatchInput = {
        matchId,
        teamA: {
          players: [
            { playerId: context.teamAPlayers[0].playerId, rating: context.teamAPlayers[0].rating ?? RATING_CONFIG.DEFAULT_RATING, ratingDeviation: context.teamAPlayers[0].ratingDeviation ?? RATING_CONFIG.DEFAULT_RD },
            { playerId: context.teamAPlayers[1].playerId, rating: context.teamAPlayers[1].rating ?? RATING_CONFIG.DEFAULT_RATING, ratingDeviation: context.teamAPlayers[1].ratingDeviation ?? RATING_CONFIG.DEFAULT_RD },
          ],
        },
        teamB: {
          players: [
            { playerId: context.teamBPlayers[0].playerId, rating: context.teamBPlayers[0].rating ?? RATING_CONFIG.DEFAULT_RATING, ratingDeviation: context.teamBPlayers[0].ratingDeviation ?? RATING_CONFIG.DEFAULT_RD },
            { playerId: context.teamBPlayers[1].playerId, rating: context.teamBPlayers[1].rating ?? RATING_CONFIG.DEFAULT_RATING, ratingDeviation: context.teamBPlayers[1].ratingDeviation ?? RATING_CONFIG.DEFAULT_RD },
          ],
        },
        winner,
        gamesWonA,
        gamesWonB,
        matchType: toRatingMatchType(context.matchType),
      };

      const events = applyMatchResult(input);
      await recordRatingEvents(events);

      if (context.categoryId) {
        await reconcileBracket(context.tournamentId, context.categoryId);
      }
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo registrar el resultado." };
  }

  revalidatePath("/dashboard/partidos");
  revalidatePath(`/dashboard/torneos/${tournamentId}/cuadro`);
  return { error: null };
}

export async function setMatchCourtAction(tournamentId: string, matchId: string, courtId: string | null): Promise<SimpleActionState> {
  const auth = await requireTournamentManager(tournamentId);
  if (!auth.ok) return { error: auth.error };

  try {
    await setMatchCourt(matchId, courtId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo asignar la pista." };
  }

  revalidatePath("/dashboard/partidos");
  return { error: null };
}

export async function startMatchAction(tournamentId: string, matchId: string): Promise<SimpleActionState> {
  const auth = await requireTournamentManager(tournamentId);
  if (!auth.ok) return { error: auth.error };

  try {
    await setMatchInProgress(matchId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo iniciar el partido." };
  }

  revalidatePath("/dashboard/partidos");
  return { error: null };
}
