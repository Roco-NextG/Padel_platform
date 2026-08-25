"use server";

import { revalidatePath } from "next/cache";
import { validateMatchResult, type SetScoreInput, type TeamSide } from "@padel-platform/match-engine";
import { applyMatchResult, RATING_CONFIG, type MatchTypeForRating, type RatingMatchInput } from "@padel-platform/rating-engine";
import {
  cancelMatch,
  clearMatchSchedule,
  fetchMatchRatingContext,
  findScheduleConflict,
  recordRatingEvents,
  setMatchCourt,
  setMatchInProgress,
  setMatchPaused,
  setMatchSchedule,
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

/** Duración fija asumida por partido — no hay ningún concepto de duración modelado todavía; 90 min es razonable para pádel y solo se usa para detectar choques de horario en la misma pista. */
const MATCH_DURATION_MINUTES = 90;

export async function scheduleMatchAction(
  tournamentId: string,
  matchId: string,
  courtId: string,
  scheduledStartIso: string
): Promise<SimpleActionState> {
  const auth = await requireTournamentManager(tournamentId);
  if (!auth.ok) return { error: auth.error };

  const scheduledStart = new Date(scheduledStartIso);
  const scheduledEnd = new Date(scheduledStart.getTime() + MATCH_DURATION_MINUTES * 60_000);

  try {
    const hasConflict = await findScheduleConflict(courtId, scheduledStart.toISOString(), scheduledEnd.toISOString(), matchId);
    if (hasConflict) return { error: "Esa pista ya tiene un partido programado en ese horario." };

    await setMatchSchedule(matchId, courtId, scheduledStart.toISOString(), scheduledEnd.toISOString());
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo programar el partido." };
  }

  revalidatePath("/dashboard/partidos");
  return { error: null };
}

export async function unscheduleMatchAction(tournamentId: string, matchId: string): Promise<SimpleActionState> {
  const auth = await requireTournamentManager(tournamentId);
  if (!auth.ok) return { error: auth.error };

  try {
    await clearMatchSchedule(matchId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo quitar el partido del calendario." };
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

export async function pauseMatchAction(tournamentId: string, matchId: string): Promise<SimpleActionState> {
  const auth = await requireTournamentManager(tournamentId);
  if (!auth.ok) return { error: auth.error };

  try {
    await setMatchPaused(matchId, true);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo pausar el partido." };
  }

  revalidatePath("/dashboard/partidos");
  return { error: null };
}

export async function resumeMatchAction(tournamentId: string, matchId: string): Promise<SimpleActionState> {
  const auth = await requireTournamentManager(tournamentId);
  if (!auth.ok) return { error: auth.error };

  try {
    await setMatchPaused(matchId, false);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo reanudar el partido." };
  }

  revalidatePath("/dashboard/partidos");
  return { error: null };
}

export async function cancelMatchAction(tournamentId: string, matchId: string): Promise<SimpleActionState> {
  const auth = await requireTournamentManager(tournamentId);
  if (!auth.ok) return { error: auth.error };

  try {
    await cancelMatch(matchId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo cancelar el partido." };
  }

  revalidatePath("/dashboard/partidos");
  return { error: null };
}
