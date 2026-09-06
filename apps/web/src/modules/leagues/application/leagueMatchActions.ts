"use server";

import { revalidatePath } from "next/cache";
import type { SetScoreInput, TeamSide } from "@padel-platform/match-engine";
import { applyConfirmedMatchResult, type SimpleActionState } from "@/modules/matches/application/matchActions";
import { requireLeagueManager } from "./leagueAuthGuard";

/**
 * Liga no tiene scoring_config propio todavía (a diferencia de tournaments)
 * — todo partido de Liga usa el config por defecto (resolveScoringConfig({})
 * en applyConfirmedMatchResult). Si más adelante se necesita personalizar
 * el marcador por Liga, esto pasa a leer league.scoringConfig igual que
 * tournamentId lo hace hoy.
 */
export async function submitLeagueMatchResultAction(
  leagueId: string,
  matchId: string,
  sets: SetScoreInput[],
  winner: TeamSide
): Promise<SimpleActionState> {
  const auth = await requireLeagueManager(leagueId);
  if (!auth.ok) return { error: auth.error };

  const result = await applyConfirmedMatchResult(matchId, {}, sets, winner);
  if (result.error) return result;

  revalidatePath(`/dashboard/ligas/${leagueId}`);
  return { error: null };
}
