"use server";

import { revalidatePath } from "next/cache";
import { validateMatchResult } from "@padel-platform/match-engine";
import type { SetScoreInput } from "@padel-platform/match-engine";
import { matchResultSubmissionSchema } from "../domain/match";
import {
  fetchMatchStatus,
  fetchMatchWithContext,
  submitMatchResultRpc,
  upsertMatchConfirmation,
} from "../infrastructure/matchRepository";
import { fetchAuthenticatedUser } from "@/modules/auth/infrastructure/authRepository";
import { fetchPlayerByUserId } from "@/modules/players/infrastructure/playerRepository";
import {
  isDuplicateRatingEventsError,
  recordRatingEventsForMatch,
} from "@/modules/rating/application/recordRatingEventsForMatch";
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
