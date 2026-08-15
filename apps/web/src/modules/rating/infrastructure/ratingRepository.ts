import { createClient } from "@/lib/supabase/server";
import type { Database, RatingEventRpcInput } from "@/lib/supabase/database.types";
import type { PlayerRatingState, RatingEventOutput } from "@padel-platform/rating-engine";
import { createColdStartRating } from "@padel-platform/rating-engine";

type MatchRow = Database["public"]["Tables"]["matches"]["Row"];

export async function fetchMatchForRating(matchId: string): Promise<MatchRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Suma de games por equipo a lo largo de todos los sets del partido. */
export async function fetchMatchGameTotals(
  matchId: string
): Promise<{ gamesWonA: number; gamesWonB: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("set_scores")
    .select("team_a_games, team_b_games")
    .eq("match_id", matchId);
  if (error) throw new Error(error.message);

  return (data ?? []).reduce(
    (totals, set) => ({
      gamesWonA: totals.gamesWonA + set.team_a_games,
      gamesWonB: totals.gamesWonB + set.team_b_games,
    }),
    { gamesWonA: 0, gamesWonB: 0 }
  );
}

/**
 * Estado de rating de los 2 jugadores de un equipo, listo para
 * `applyMatchResult`. Un jugador sin partidos previos (`current_rating`
 * null) entra con el estado de cold start del propio motor
 * (createColdStartRating) — nunca se inventa un default local.
 */
export async function fetchTeamRatingState(
  teamId: string
): Promise<[PlayerRatingState, PlayerRatingState]> {
  const supabase = await createClient();

  const { data: members, error: membersError } = await supabase
    .from("team_members")
    .select("player_id")
    .eq("team_id", teamId);
  if (membersError) throw new Error(membersError.message);
  if (!members || members.length !== 2) {
    throw new Error(
      `El equipo ${teamId} tiene ${members?.length ?? 0} jugador(es); se esperaban exactamente 2.`
    );
  }

  const playerIds = members.map((m) => m.player_id);
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, current_rating, current_rating_deviation")
    .in("id", playerIds);
  if (playersError) throw new Error(playersError.message);

  const states = playerIds.map((id): PlayerRatingState => {
    const player = players?.find((p) => p.id === id);
    if (!player) throw new Error(`Jugador ${id} no encontrado.`);
    if (player.current_rating == null || player.current_rating_deviation == null) {
      return createColdStartRating(id);
    }
    return {
      playerId: id,
      rating: player.current_rating,
      ratingDeviation: player.current_rating_deviation,
    };
  });

  return [states[0], states[1]];
}

function toRpcInput(event: RatingEventOutput): RatingEventRpcInput {
  return {
    playerId: event.playerId,
    matchId: event.matchId,
    partnerId: event.partnerId,
    oldRating: event.oldRating,
    newRating: event.newRating,
    oldRD: event.oldRD,
    newRD: event.newRD,
    reason: event.reason,
    algorithmVersion: event.algorithmVersion,
  };
}

/**
 * Único punto de escritura de RatingEvent (docs/01_ARCHITECTURE.md §6.3):
 * delega en la función `record_rating_events` (security definer,
 * supabase/migrations/0004_rating_rpc.sql), que valida que el partido esté
 * CONFIRMED y que el caller lo administre, inserta las filas y proyecta
 * `players.current_rating`/`current_rating_deviation` — nunca se hace un
 * `insert`/`update` directo desde el cliente.
 */
export async function insertRatingEvents(
  events: RatingEventOutput[]
): Promise<Database["public"]["Tables"]["rating_events"]["Row"][]> {
  if (events.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_rating_events", {
    p_events: events.map(toRpcInput),
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}
