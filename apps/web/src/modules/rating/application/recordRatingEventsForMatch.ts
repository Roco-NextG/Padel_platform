import { applyMatchResult } from "@padel-platform/rating-engine";
import type { MatchTypeForRating, RatingMatchInput } from "@padel-platform/rating-engine";
import type { DbMatchType } from "@/lib/supabase/database.types";
import {
  fetchMatchForRating,
  fetchMatchGameTotals,
  fetchTeamRatingState,
  insertRatingEvents,
} from "../infrastructure/ratingRepository";

/**
 * `CASUAL` matches never generate a RatingEvent — `rating_reason` (0001_schema.sql)
 * only has TOURNAMENT_MATCH/COMPETITIVE_MATCH. Casual play is unrated by
 * design (docs/06_MATCH_ENGINE.md §1: CASUAL is a v2 concept, not exposed yet).
 */
function toRatingMatchType(matchType: DbMatchType): MatchTypeForRating | null {
  if (matchType === "TOURNAMENT") return "TOURNAMENT";
  if (matchType === "COMPETITIVE") return "COMPETITIVE";
  return null;
}

/**
 * The integration point for the Rating Engine (docs/05_RATING_ENGINE.md).
 *
 * Not called from anywhere yet — the Match Engine (Phase 6, confirmation
 * flow with scoring validation) is out of scope for this pass. Once it
 * exists, call this the moment `Match.status` transitions to `CONFIRMED`
 * (e.g. from `submit_match_result` in 0002_rls.sql, or from wherever the
 * application layer resolves that transition) and nowhere else — a match
 * that isn't CONFIRMED must never produce a RatingEvent (hard rule, see
 * docs/05_RATING_ENGINE.md §9). `record_rating_events` (0004_rating_rpc.sql)
 * also enforces this server-side, so calling it early fails loudly instead
 * of silently writing bad data.
 *
 * Read match + both teams' current rating state -> pure `applyMatchResult`
 * (never reimplemented here) -> persist via the one RPC allowed to write
 * `rating_events` / project `players.current_rating`.
 */
export async function recordRatingEventsForMatch(matchId: string) {
  const match = await fetchMatchForRating(matchId);
  if (!match) throw new Error(`Match ${matchId} no encontrado.`);

  if (match.status !== "CONFIRMED") {
    throw new Error(
      `recordRatingEventsForMatch: el partido ${matchId} no está CONFIRMED (status: ${match.status}).`
    );
  }
  if (!match.team_a_id || !match.team_b_id) {
    throw new Error(`El partido ${matchId} no tiene ambos equipos asignados.`);
  }
  if (!match.winner_team_id) {
    throw new Error(`El partido ${matchId} está CONFIRMED pero no tiene winner_team_id.`);
  }

  const matchType = toRatingMatchType(match.match_type);
  if (!matchType) {
    throw new Error(
      `El partido ${matchId} es de tipo ${match.match_type}, que no genera RatingEvent.`
    );
  }

  const [teamAPlayers, teamBPlayers, gameTotals] = await Promise.all([
    fetchTeamRatingState(match.team_a_id),
    fetchTeamRatingState(match.team_b_id),
    fetchMatchGameTotals(matchId),
  ]);

  const input: RatingMatchInput = {
    matchId,
    teamA: { players: teamAPlayers },
    teamB: { players: teamBPlayers },
    winner: match.winner_team_id === match.team_a_id ? "A" : "B",
    gamesWonA: gameTotals.gamesWonA,
    gamesWonB: gameTotals.gamesWonB,
    matchType,
  };

  const events = applyMatchResult(input);
  return insertRatingEvents(events);
}

/**
 * True when `error` is `record_rating_events` rejecting a match that
 * already has active rating events (0008_rating_rpc_player_validation.sql)
 * — the expected outcome of a double-click, a network retry, or two
 * near-simultaneous confirmations that both see the match as CONFIRMED.
 * The rating was already applied by whichever call landed first; this is
 * not a failure the caller needs to surface.
 *
 * Matches two forms: the function's own readable message (the common,
 * sequential case) and the raw unique_violation Postgres raises when two
 * calls are genuinely concurrent and both pass the function's own check
 * before either commits — the partial unique index on
 * `rating_events(player_id, match_id) where not superseded` is what
 * actually guarantees this under real concurrency, not the check itself.
 */
export function isDuplicateRatingEventsError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("ya tiene eventos de rating registrados") ||
    error.message.includes("rating_events_player_match_active_unique")
  );
}
