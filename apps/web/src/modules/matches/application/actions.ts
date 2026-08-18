"use server";

import { revalidatePath } from "next/cache";
import { applyMatchResult } from "@padel-platform/rating-engine";
import type { RatingMatchInput } from "@padel-platform/rating-engine";
import { validateMatchResult } from "@padel-platform/match-engine";
import type { SetScoreInput } from "@padel-platform/match-engine";
import { matchResultSubmissionSchema } from "../domain/match";
import {
  applyMatchCorrectionRpc,
  fetchMatchStatus,
  fetchMatchWithContext,
  submitMatchResultRpc,
  upsertMatchConfirmation,
} from "../infrastructure/matchRepository";
import type { DbMatchType } from "@/lib/supabase/database.types";
import { fetchAuthenticatedUser } from "@/modules/auth/infrastructure/authRepository";
import { fetchPlayerByUserId } from "@/modules/players/infrastructure/playerRepository";
import {
  isDuplicateRatingEventsError,
  recordRatingEventsForMatch,
  toRatingMatchType,
} from "@/modules/rating/application/recordRatingEventsForMatch";
import { fetchTeamRatingState } from "@/modules/rating/infrastructure/ratingRepository";
import { advanceOrFinishBracket } from "@/modules/tournaments/application/advanceOrFinishBracket";

/**
 * The rating side-effect never gets to fail the primary action: the match
 * confirmation itself already succeeded by the time this runs. A duplicate
 * rejection (double-click, retry, two near-simultaneous confirmations — see
 * isDuplicateRatingEventsError) means the rating was already applied by the
 * first call, so it's silently ignored. Anything else is unexpected and
 * worth knowing about, but still shouldn't turn a successful confirmation
 * into an error response — it's logged server-side instead.
 */
async function recordRatingEventsIgnoringDuplicates(matchId: string): Promise<void> {
  try {
    await recordRatingEventsForMatch(matchId);
  } catch (e) {
    if (!isDuplicateRatingEventsError(e)) {
      console.error(`recordRatingEventsForMatch falló para el partido ${matchId}:`, e);
    }
  }
}

/**
 * Igual criterio que recordRatingEventsIgnoringDuplicates: el avance de
 * cuadro es un efecto secundario de la confirmación, nunca su condición de
 * éxito. advanceOrFinishBracket ya es un no-op silencioso para partidos sin
 * fase de bracket (GROUPS o ninguna) — este catch es solo para errores
 * genuinamente inesperados (ej. create_bracket_match rechazado por RLS).
 */
async function advanceBracketIgnoringErrors(matchId: string): Promise<void> {
  try {
    await advanceOrFinishBracket(matchId);
  } catch (e) {
    console.error(`advanceOrFinishBracket falló para el partido ${matchId}:`, e);
  }
}

export interface MatchActionState {
  error: string | null;
  success: boolean;
}

function parseSetsFromForm(formData: FormData): SetScoreInput[] {
  const sets: SetScoreInput[] = [];
  for (let setNumber = 1; setNumber <= 3; setNumber++) {
    const teamAGames = formData.get(`set${setNumber}_teamA`);
    const teamBGames = formData.get(`set${setNumber}_teamB`);
    if (teamAGames === null || teamAGames === "" || teamBGames === null || teamBGames === "") {
      continue;
    }
    const tiebreakA = formData.get(`set${setNumber}_tbA`);
    const tiebreakB = formData.get(`set${setNumber}_tbB`);
    sets.push({
      setNumber,
      teamAGames: Number(teamAGames),
      teamBGames: Number(teamBGames),
      tiebreakA: tiebreakA ? Number(tiebreakA) : null,
      tiebreakB: tiebreakB ? Number(tiebreakB) : null,
    });
  }
  return sets;
}

/**
 * Shared by the organizer's direct-confirm path and a player-initiated
 * submission — `validateMatchResult` (pure, from @padel-platform/match-engine)
 * is the only gate before anything touches the database, exactly as its own
 * README requires. Never skipped, never reimplemented.
 */
export async function submitMatchResultAction(
  matchId: string,
  asOrganizer: boolean,
  _prev: MatchActionState,
  formData: FormData
): Promise<MatchActionState> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", success: false };

  const raw = {
    sets: parseSetsFromForm(formData),
    winner: formData.get("winner"),
  };
  const parsed = matchResultSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa el resultado ingresado.", success: false };
  }

  const match = await fetchMatchWithContext(matchId);
  if (!match) return { error: "No se encontró el partido.", success: false };

  const validation = validateMatchResult(parsed.data.sets, match.scoringConfig, parsed.data.winner);
  if (!validation.valid) {
    return { error: validation.errors.join(" "), success: false };
  }

  let updated;
  try {
    updated = await submitMatchResultRpc({
      matchId,
      sets: parsed.data.sets,
      winner: parsed.data.winner,
      byOrganizer: asOrganizer,
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo registrar el resultado. Intenta de nuevo.",
      success: false,
    };
  }

  if (updated.status === "CONFIRMED") {
    await recordRatingEventsIgnoringDuplicates(matchId);
    await advanceBracketIgnoringErrors(matchId);
  }

  revalidatePath(`/dashboard/partidos/${matchId}`);
  revalidatePath("/dashboard/partidos");
  revalidatePath("/");
  return { error: null, success: true };
}

async function respondToMatch(matchId: string, confirmed: boolean): Promise<MatchActionState> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", success: false };

  const player = await fetchPlayerByUserId(user.id);
  if (!player) return { error: "No se encontró tu perfil de jugador.", success: false };

  try {
    await upsertMatchConfirmation(matchId, player.id, confirmed);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo registrar tu respuesta. Intenta de nuevo.",
      success: false,
    };
  }

  const status = await fetchMatchStatus(matchId);
  if (status === "CONFIRMED") {
    await recordRatingEventsIgnoringDuplicates(matchId);
    await advanceBracketIgnoringErrors(matchId);
  }

  revalidatePath("/");
  revalidatePath(`/dashboard/partidos/${matchId}`);
  return { error: null, success: true };
}

// `useActionState` requires the (prevState, formData) shape once matchId is
// bound; neither is read since confirming/rejecting carries no form fields.
/* eslint-disable @typescript-eslint/no-unused-vars */
export async function confirmMatchResultAction(
  matchId: string,
  _prev: MatchActionState,
  _formData: FormData
): Promise<MatchActionState> {
  return respondToMatch(matchId, true);
}

export async function rejectMatchResultAction(
  matchId: string,
  _prev: MatchActionState,
  _formData: FormData
): Promise<MatchActionState> {
  return respondToMatch(matchId, false);
}
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * Corrección de un resultado ya CONFIRMED (docs/05_RATING_ENGINE.md §8).
 * La autorización real la impone `apply_match_correction` (is_admin(), igual
 * criterio que grantRoleAction) — este chequeo de sesión solo da un mensaje
 * más claro que el error crudo de Postgres para un no-admin.
 *
 * Recalcula los 4 rating_events del partido con el rating ACTUAL de los
 * jugadores (no el que tenían al momento del partido original), reusando
 * exactamente el mismo camino que recordRatingEventsForMatch: mismo
 * validateMatchResult, mismo applyMatchResult, mismo fetchTeamRatingState.
 * No repropaga a otros partidos posteriores que esos jugadores hayan jugado
 * desde entonces — eso es replayRatingHistory() de rating-engine, conectarlo
 * a una repropagación completa queda deliberadamente fuera de este alcance.
 */
export async function correctMatchResultAction(
  matchId: string,
  _prev: MatchActionState,
  formData: FormData
): Promise<MatchActionState> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", success: false };

  const raw = {
    sets: parseSetsFromForm(formData),
    winner: formData.get("winner"),
  };
  const parsed = matchResultSubmissionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa el resultado ingresado.", success: false };
  }

  const match = await fetchMatchWithContext(matchId);
  if (!match) return { error: "No se encontró el partido.", success: false };

  if (match.status !== "CONFIRMED") {
    return {
      error:
        "Solo se puede corregir un partido ya confirmado. Para este partido, usa el registro normal de resultado.",
      success: false,
    };
  }

  const validation = validateMatchResult(parsed.data.sets, match.scoringConfig, parsed.data.winner);
  if (!validation.valid) {
    return { error: validation.errors.join(" "), success: false };
  }

  const matchType = toRatingMatchType(match.matchType as DbMatchType);
  if (!matchType) {
    return {
      error: `Los partidos de tipo ${match.matchType} no generan eventos de rating.`,
      success: false,
    };
  }

  const winnerTeamId = parsed.data.winner === "A" ? match.teamA.teamId : match.teamB.teamId;
  const gameTotals = parsed.data.sets.reduce(
    (totals, s) => ({
      gamesWonA: totals.gamesWonA + s.teamAGames,
      gamesWonB: totals.gamesWonB + s.teamBGames,
    }),
    { gamesWonA: 0, gamesWonB: 0 }
  );

  let events;
  try {
    const [teamAPlayers, teamBPlayers] = await Promise.all([
      fetchTeamRatingState(match.teamA.teamId),
      fetchTeamRatingState(match.teamB.teamId),
    ]);

    const input: RatingMatchInput = {
      matchId,
      teamA: { players: teamAPlayers },
      teamB: { players: teamBPlayers },
      winner: parsed.data.winner,
      gamesWonA: gameTotals.gamesWonA,
      gamesWonB: gameTotals.gamesWonB,
      matchType,
    };
    events = applyMatchResult(input);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo recalcular el rating. Intenta de nuevo.",
      success: false,
    };
  }

  try {
    await applyMatchCorrectionRpc({
      matchId,
      sets: parsed.data.sets,
      winnerTeamId,
      ratingEvents: events,
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo aplicar la corrección. Intenta de nuevo.",
      success: false,
    };
  }

  revalidatePath(`/dashboard/partidos/${matchId}`);
  revalidatePath("/dashboard/partidos");
  if (match.tournamentId) revalidatePath(`/dashboard/torneos/${match.tournamentId}`);
  revalidatePath("/");
  return { error: null, success: true };
}
