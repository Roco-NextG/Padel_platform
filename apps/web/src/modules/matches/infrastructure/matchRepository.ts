import { createClient } from "@/lib/supabase/server";
import type { RatingEventOutput } from "@padel-platform/rating-engine";
import type { SetScoreInput } from "@padel-platform/match-engine";
import { resolveScoringConfig, type MatchListItem, type MatchTeamView } from "../domain/match";
import type { ClubSurfaceAccount } from "@/modules/shell/infrastructure/accountRepository";
import { DEFAULT_TIME_ZONE } from "@/lib/timezone";

interface RawTeamMember {
  players: { id: string; first_name: string; last_name: string } | null;
}

function toTeamView(teamId: string | null, members: RawTeamMember[] | null | undefined): MatchTeamView | null {
  if (!teamId) return null;
  return {
    teamId,
    players: (members ?? [])
      .filter((m) => m.players)
      .map((m) => ({ playerId: m.players!.id, firstName: m.players!.first_name, lastName: m.players!.last_name })),
  };
}

const MATCH_LIST_SELECT = `
  id, tournament_id, phase_id, group_id, court_id, status, is_paused, scheduled_start, scheduled_end, actual_start,
  team_a_id, team_b_id, winner_team_id,
  tournaments(name, scoring_config, clubs(name, time_zone)),
  tournament_phases(type, category_id, tournament_categories(name)),
  tournament_groups(name),
  courts(name),
  team_a:teams!matches_team_a_id_fkey(id, team_members(players(id, first_name, last_name))),
  team_b:teams!matches_team_b_id_fkey(id, team_members(players(id, first_name, last_name))),
  set_scores(set_number, team_a_games, team_b_games, tiebreak_a, tiebreak_b)
`;

/** Todos los partidos "activos" (no terminados) de los torneos que administra esta cuenta — cross-tournament, para la pantalla Partidos. */
export async function fetchManagedMatches(account: ClubSurfaceAccount): Promise<MatchListItem[]> {
  const supabase = await createClient();
  let tournamentQuery = supabase.from("tournaments").select("id");
  tournamentQuery =
    account.role === "Club"
      ? tournamentQuery.eq("club_id", account.clubId!).is("organizer_id", null)
      : tournamentQuery.eq("organizer_id", account.organizerId!);
  const { data: tournaments, error: tournamentsError } = await tournamentQuery;
  if (tournamentsError) throw new Error(tournamentsError.message);
  const tournamentIds = (tournaments ?? []).map((t) => t.id);
  if (tournamentIds.length === 0) return [];

  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_LIST_SELECT)
    .in("tournament_id", tournamentIds)
    .in("status", ["SCHEDULED", "IN_PROGRESS", "PENDING_CONFIRMATION", "DISPUTED", "CANCELLED", "CONFIRMED"])
    .not("team_a_id", "is", null)
    .not("team_b_id", "is", null)
    .order("scheduled_start", { ascending: true, nullsFirst: false })
    .order("created_at");
  if (error) throw new Error(error.message);

  return mapMatchRows(data);
}

/** Todos los partidos reales (sin placeholders de bye) de UN torneo — para el planificador, incluye también los ya CONFIRMED/CANCELLED para poder mostrarlos "locked" en el calendario. */
export async function fetchMatchesForTournament(tournamentId: string): Promise<MatchListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_LIST_SELECT)
    .eq("tournament_id", tournamentId)
    .not("team_a_id", "is", null)
    .not("team_b_id", "is", null)
    .order("scheduled_start", { ascending: true, nullsFirst: false })
    .order("created_at");
  if (error) throw new Error(error.message);
  return mapMatchRows(data);
}

export async function fetchMatchesForCategory(categoryId: string): Promise<MatchListItem[]> {
  const supabase = await createClient();
  const { data: phases } = await supabase.from("tournament_phases").select("id").eq("category_id", categoryId);
  const phaseIds = (phases ?? []).map((p) => p.id);
  if (phaseIds.length === 0) return [];

  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_LIST_SELECT)
    .in("phase_id", phaseIds)
    .order("round_index");
  if (error) throw new Error(error.message);
  return mapMatchRows(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSets(raw: any[] | null | undefined): SetScoreInput[] {
  return [...(raw ?? [])]
    .sort((a, b) => a.set_number - b.set_number)
    .map((s) => ({
      setNumber: s.set_number,
      teamAGames: s.team_a_games,
      teamBGames: s.team_b_games,
      tiebreakA: s.tiebreak_a,
      tiebreakB: s.tiebreak_b,
    }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMatchRows(rows: any[] | null): MatchListItem[] {
  return (rows ?? []).map((m) => ({
    id: m.id,
    tournamentId: m.tournament_id,
    tournamentName: m.tournaments?.name ?? "?",
    clubName: m.tournaments?.clubs?.name ?? "?",
    clubTimeZone: m.tournaments?.clubs?.time_zone ?? DEFAULT_TIME_ZONE,
    categoryName: m.tournament_phases?.tournament_categories?.name ?? "?",
    phaseLabel: m.tournament_phases?.type ?? "?",
    groupName: m.tournament_groups?.name ?? null,
    courtId: m.court_id,
    courtName: m.courts?.name ?? null,
    status: m.status,
    isPaused: m.is_paused,
    scheduledStart: m.scheduled_start,
    scheduledEnd: m.scheduled_end,
    actualStart: m.actual_start,
    teamA: toTeamView(m.team_a_id, m.team_a?.team_members),
    teamB: toTeamView(m.team_b_id, m.team_b?.team_members),
    winnerTeamId: m.winner_team_id,
    scoringConfig: resolveScoringConfig(m.tournaments?.scoring_config ?? {}),
    sets: mapSets(m.set_scores),
  }));
}

export interface RecentResult {
  id: string;
  winnerLabel: string;
  scoreLabel: string;
}

/** "Últimos resultados" del dashboard — partidos CONFIRMED más recientes, cross-tournament. */
export async function fetchRecentResults(account: ClubSurfaceAccount, limit: number): Promise<RecentResult[]> {
  const supabase = await createClient();
  let tournamentQuery = supabase.from("tournaments").select("id");
  tournamentQuery =
    account.role === "Club"
      ? tournamentQuery.eq("club_id", account.clubId!).is("organizer_id", null)
      : tournamentQuery.eq("organizer_id", account.organizerId!);
  const { data: tournaments } = await tournamentQuery;
  const tournamentIds = (tournaments ?? []).map((t) => t.id);
  if (tournamentIds.length === 0) return [];

  const { data, error } = await supabase
    .from("matches")
    .select(
      `id, winner_team_id, team_a_id, team_b_id,
       set_scores(set_number, team_a_games, team_b_games),
       team_a:teams!matches_team_a_id_fkey(id, team_members(players(first_name, last_name))),
       team_b:teams!matches_team_b_id_fkey(id, team_members(players(first_name, last_name)))`
    )
    .in("tournament_id", tournamentIds)
    .eq("status", "CONFIRMED")
    .not("team_a_id", "is", null)
    .not("team_b_id", "is", null)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((m) => {
    const winnerTeam = m.winner_team_id === m.team_a_id ? m.team_a : m.team_b;
    const members = (winnerTeam?.team_members ?? []) as { players: { first_name: string; last_name: string } | null }[];
    const winnerLabel = members
      .filter((mm) => mm.players)
      .map((mm) => mm.players!.first_name)
      .join(" / ");
    const sets = [...(m.set_scores ?? [])].sort(
      (a: { set_number: number }, b: { set_number: number }) => a.set_number - b.set_number
    );
    const scoreLabel = sets.map((s: { team_a_games: number; team_b_games: number }) => `${s.team_a_games}-${s.team_b_games}`).join(", ");
    return { id: m.id as string, winnerLabel: winnerLabel || "?", scoreLabel };
  });
}

export interface MatchRatingContext {
  tournamentId: string;
  categoryId: string | null;
  matchType: "TOURNAMENT" | "COMPETITIVE" | "CASUAL";
  teamAId: string;
  teamBId: string;
  teamAPlayers: { playerId: string; rating: number | null; ratingDeviation: number | null }[];
  teamBPlayers: { playerId: string; rating: number | null; ratingDeviation: number | null }[];
}

export async function fetchMatchRatingContext(matchId: string): Promise<MatchRatingContext | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      `id, tournament_id, match_type, team_a_id, team_b_id,
       tournament_phases(category_id),
       team_a:teams!matches_team_a_id_fkey(team_members(players(id, current_rating, current_rating_deviation))),
       team_b:teams!matches_team_b_id_fkey(team_members(players(id, current_rating, current_rating_deviation)))`
    )
    .eq("id", matchId)
    .single();
  if (error) throw new Error(error.message);
  if (!data.team_a_id || !data.team_b_id) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extract = (team: any) =>
    ((team?.team_members ?? []) as { players: { id: string; current_rating: number | null; current_rating_deviation: number | null } | null }[])
      .filter((m) => m.players)
      .map((m) => ({
        playerId: m.players!.id,
        rating: m.players!.current_rating,
        ratingDeviation: m.players!.current_rating_deviation,
      }));

  return {
    tournamentId: data.tournament_id!,
    categoryId: (data.tournament_phases as unknown as { category_id: string } | null)?.category_id ?? null,
    matchType: data.match_type,
    teamAId: data.team_a_id,
    teamBId: data.team_b_id,
    teamAPlayers: extract(data.team_a),
    teamBPlayers: extract(data.team_b),
  };
}

export async function submitResult(matchId: string, sets: SetScoreInput[], winner: "A" | "B"): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_match_result", {
    p_match_id: matchId,
    p_sets: sets.map((s) => ({ setNumber: s.setNumber, teamAGames: s.teamAGames, teamBGames: s.teamBGames, tiebreakA: s.tiebreakA ?? null, tiebreakB: s.tiebreakB ?? null })),
    p_winner: winner,
    p_by_organizer: true,
  });
  if (error) throw new Error(error.message);
}

export async function recordRatingEvents(events: RatingEventOutput[]): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_rating_events", { p_events: events });
  if (error) throw new Error(error.message);
}

export async function setMatchCourt(matchId: string, courtId: string | null): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("matches").update({ court_id: courtId }).eq("id", matchId);
  if (error) throw new Error(error.message);
}

export async function setMatchInProgress(matchId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("matches").update({ status: "IN_PROGRESS", actual_start: new Date().toISOString() }).eq("id", matchId);
  if (error) throw new Error(error.message);
}

export async function setMatchPaused(matchId: string, paused: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("matches").update({ is_paused: paused }).eq("id", matchId);
  if (error) throw new Error(error.message);
}

export async function cancelMatch(matchId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("matches").update({ status: "CANCELLED", is_paused: false }).eq("id", matchId);
  if (error) throw new Error(error.message);
}

/** Otro partido en la misma pista cuyo [scheduled_start, scheduled_end) se superpone con el rango propuesto — excluye el propio partido y los cancelados. */
export async function findScheduleConflict(
  courtId: string,
  scheduledStart: string,
  scheduledEnd: string,
  excludeMatchId: string
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("id")
    .eq("court_id", courtId)
    .neq("id", excludeMatchId)
    .neq("status", "CANCELLED")
    .lt("scheduled_start", scheduledEnd)
    .gt("scheduled_end", scheduledStart)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

/** Solo reprograma partidos SCHEDULED — un partido ya en juego/confirmado no se puede mover desde el planificador. */
export async function setMatchSchedule(matchId: string, courtId: string, scheduledStart: string, scheduledEnd: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .update({ court_id: courtId, scheduled_start: scheduledStart, scheduled_end: scheduledEnd })
    .eq("id", matchId)
    .eq("status", "SCHEDULED")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("El partido ya no está disponible para programar.");
}

export async function clearMatchSchedule(matchId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .update({ court_id: null, scheduled_start: null, scheduled_end: null })
    .eq("id", matchId)
    .eq("status", "SCHEDULED")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("El partido ya no está disponible para desprogramar.");
}
