import { createClient } from "@/lib/supabase/server";
import type { Database, RatingEventRpcInput, SetScoreRpcInput } from "@/lib/supabase/database.types";
import { parseScoringConfig } from "../domain/match";
import type {
  MatchConfirmationState,
  MatchParticipant,
  MatchTeam,
  MatchWithContext,
} from "../domain/match";

type MatchRow = Database["public"]["Tables"]["matches"]["Row"];

async function fetchTeam(teamId: string): Promise<MatchTeam> {
  const supabase = await createClient();
  const { data: members, error: membersError } = await supabase
    .from("team_members")
    .select("player_id")
    .eq("team_id", teamId);
  if (membersError) throw new Error(membersError.message);

  const playerIds = (members ?? []).map((m) => m.player_id);
  if (playerIds.length === 0) return { teamId, players: [] };

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, first_name, last_name")
    .in("id", playerIds);
  if (playersError) throw new Error(playersError.message);

  const participants: MatchParticipant[] = playerIds.map((id) => {
    const p = players?.find((row) => row.id === id);
    return { playerId: id, firstName: p?.first_name ?? "?", lastName: p?.last_name ?? "" };
  });

  return { teamId, players: participants };
}

export async function fetchMatchWithContext(matchId: string): Promise<MatchWithContext | null> {
  const supabase = await createClient();
  const { data: match, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!match || !match.team_a_id || !match.team_b_id) return null;

  let tournamentName: string | null = null;
  let scoringConfig = parseScoringConfig(null);
  if (match.tournament_id) {
    const { data: tournament } = await supabase
      .from("tournaments")
      .select("name, scoring_config")
      .eq("id", match.tournament_id)
      .maybeSingle();
    if (tournament) {
      tournamentName = tournament.name;
      scoringConfig = parseScoringConfig(tournament.scoring_config);
    }
  }

  const [teamA, teamB, sets] = await Promise.all([
    fetchTeam(match.team_a_id),
    fetchTeam(match.team_b_id),
    fetchSets(matchId),
  ]);

  return {
    id: match.id,
    status: match.status,
    matchType: match.match_type,
    tournamentId: match.tournament_id,
    tournamentName,
    scheduledStart: match.scheduled_start,
    scoringConfig,
    teamA,
    teamB,
    winnerTeamId: match.winner_team_id,
    sets,
  };
}

async function fetchSets(matchId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("set_scores")
    .select("set_number, team_a_games, team_b_games, tiebreak_a, tiebreak_b")
    .eq("match_id", matchId)
    .order("set_number");
  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => ({
    setNumber: s.set_number,
    teamAGames: s.team_a_games,
    teamBGames: s.team_b_games,
    tiebreakA: s.tiebreak_a,
    tiebreakB: s.tiebreak_b,
  }));
}

/** Every known participant, with `confirmed: null` when no row exists yet — that absence IS "pending" (see 0007_match_engine_rpc.sql). */
export async function fetchMatchConfirmations(
  matchId: string,
  participantIds: string[]
): Promise<MatchConfirmationState[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_confirmations")
    .select("player_id, confirmed")
    .eq("match_id", matchId);
  if (error) throw new Error(error.message);

  return participantIds.map((playerId) => {
    const row = data?.find((r) => r.player_id === playerId);
    return { playerId, confirmed: row ? row.confirmed : null };
  });
}

export async function submitMatchResultRpc(input: {
  matchId: string;
  sets: SetScoreRpcInput[];
  winner: "A" | "B";
  byOrganizer: boolean;
}): Promise<MatchRow> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_match_result", {
    p_match_id: input.matchId,
    p_sets: input.sets,
    p_winner: input.winner,
    p_by_organizer: input.byOrganizer,
  });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Corrección de un partido ya CONFIRMED (docs/05_RATING_ENGINE.md §8) —
 * `apply_match_correction` (security definer, 0018_match_result_correction.sql)
 * re-valida is_admin() y el estado CONFIRMED server-side, reemplaza los sets,
 * actualiza el ganador, marca los rating_events viejos como superseded e
 * inserta los nuevos. No valida scoring ni calcula rating: eso ya pasó en la
 * capa de aplicación (validateMatchResult + applyMatchResult), igual que en
 * submitMatchResultRpc/insertRatingEvents.
 */
export async function applyMatchCorrectionRpc(input: {
  matchId: string;
  sets: SetScoreRpcInput[];
  winnerTeamId: string;
  ratingEvents: RatingEventRpcInput[];
}): Promise<MatchRow> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_match_correction", {
    p_match_id: input.matchId,
    p_sets: input.sets,
    p_winner_team_id: input.winnerTeamId,
    p_rating_events: input.ratingEvents,
  });
  if (error) throw new Error(error.message);
  return data;
}

/** Direct write, not an RPC — RLS (`match_confirmations_write`, owns_player) already permits this; the sync trigger in 0007 reacts to it. */
export async function upsertMatchConfirmation(
  matchId: string,
  playerId: string,
  confirmed: boolean
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("match_confirmations")
    .upsert(
      { match_id: matchId, player_id: playerId, confirmed, confirmed_at: new Date().toISOString() },
      { onConflict: "match_id,player_id" }
    );
  if (error) throw new Error(error.message);
}

export async function fetchMatchStatus(matchId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("status")
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.status ?? null;
}

/** RLS already scopes this to matches the caller manages or that belong to published tournaments. */
export async function fetchOrganizerMatches(): Promise<MatchRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Matches PENDING_CONFIRMATION where this player is a participant and hasn't responded yet. */
export async function fetchPendingConfirmationsForPlayer(
  playerId: string
): Promise<MatchWithContext[]> {
  const supabase = await createClient();
  const { data: memberships, error: membershipError } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("player_id", playerId);
  if (membershipError) throw new Error(membershipError.message);
  const teamIds = (memberships ?? []).map((m) => m.team_id);
  if (teamIds.length === 0) return [];

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id")
    .eq("status", "PENDING_CONFIRMATION")
    .or(`team_a_id.in.(${teamIds.join(",")}),team_b_id.in.(${teamIds.join(",")})`);
  if (matchesError) throw new Error(matchesError.message);
  if (!matches || matches.length === 0) return [];

  const { data: existingConfirmations } = await supabase
    .from("match_confirmations")
    .select("match_id")
    .eq("player_id", playerId)
    .in(
      "match_id",
      matches.map((m) => m.id)
    );
  const alreadyResponded = new Set((existingConfirmations ?? []).map((c) => c.match_id));

  const pendingMatchIds = matches.map((m) => m.id).filter((id) => !alreadyResponded.has(id));
  const withContext = await Promise.all(pendingMatchIds.map((id) => fetchMatchWithContext(id)));
  return withContext.filter((m): m is MatchWithContext => m !== null);
}

/**
 * El próximo partido del jugador todavía sin jugar (SCHEDULED/IN_PROGRESS),
 * el más próximo por horario primero — sin horario asignado queda al final,
 * ya que un bracket recién avanzado (docs/04_TOURNAMENT_ENGINE.md §8) crea
 * el Match "sin pista/horario" hasta que el organizador lo programe.
 */
export async function fetchUpcomingMatchForPlayer(playerId: string): Promise<MatchWithContext | null> {
  const supabase = await createClient();
  const { data: memberships, error: membershipError } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("player_id", playerId);
  if (membershipError) throw new Error(membershipError.message);
  const teamIds = (memberships ?? []).map((m) => m.team_id);
  if (teamIds.length === 0) return null;

  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id, scheduled_start")
    .in("status", ["SCHEDULED", "IN_PROGRESS"])
    .or(`team_a_id.in.(${teamIds.join(",")}),team_b_id.in.(${teamIds.join(",")})`)
    .order("scheduled_start", { ascending: true, nullsFirst: false })
    .limit(1);
  if (matchesError) throw new Error(matchesError.message);
  if (!matches || matches.length === 0) return null;

  return fetchMatchWithContext(matches[0].id);
}
