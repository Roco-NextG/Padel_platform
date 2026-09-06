import { generateRoundRobinSchedule } from "@padel-platform/tournament-engine";
import { createClient } from "@/lib/supabase/server";
import { fetchTeamsForLeagueCategory } from "./leagueEnrollmentRepository";
import type { MatchTeamView } from "@/modules/matches/domain/match";
import type { SetScoreInput } from "@padel-platform/match-engine";
import type { MatchStatus } from "@/lib/supabase/database.types";

export interface LeagueMatchView {
  id: string;
  roundId: string;
  teamA: MatchTeamView | null;
  teamB: MatchTeamView | null;
  status: MatchStatus;
  winnerTeamId: string | null;
  sets: SetScoreInput[];
}

/** Reparte el rango de fechas de la liga en `count` ventanas iguales — null si la liga no tiene ambas fechas cargadas (el campo es opcional). */
function computeRoundWindows(
  startDate: string | null,
  endDate: string | null,
  count: number
): { windowStart: string | null; windowEnd: string | null }[] {
  if (!startDate || !endDate || count === 0) {
    return Array.from({ length: count }, () => ({ windowStart: null, windowEnd: null }));
  }
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const totalMs = end.getTime() - start.getTime();
  if (totalMs <= 0) {
    return Array.from({ length: count }, () => ({ windowStart: startDate, windowEnd: endDate }));
  }

  const sliceMs = totalMs / count;
  const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);
  return Array.from({ length: count }, (_, i) => {
    const windowStart = new Date(start.getTime() + i * sliceMs);
    const windowEnd = i === count - 1 ? end : new Date(start.getTime() + (i + 1) * sliceMs - 86_400_000);
    return { windowStart: toIsoDate(windowStart), windowEnd: toIsoDate(windowEnd) };
  });
}

/**
 * Genera el calendario completo de una categoría de Liga de una sola vez —
 * round-robin a una vuelta vía generateRoundRobinSchedule (packages/
 * tournament-engine, método del círculo), nunca a mano. No hay "byes" que
 * insertar como fila: un equipo libre en una ronda simplemente no tiene
 * partido esa jornada (a diferencia del bye de bracket, que sí necesita un
 * partido placeholder para auto-avanzar).
 */
export async function generateLeagueSchedule(leagueId: string, categoryId: string): Promise<void> {
  const supabase = await createClient();

  const { data: existing } = await supabase.from("league_rounds").select("id").eq("category_id", categoryId).limit(1).maybeSingle();
  if (existing) throw new Error("Ya se generaron las jornadas para esta categoría.");

  const teams = await fetchTeamsForLeagueCategory(categoryId);
  if (teams.length < 2) throw new Error("Se necesitan al menos 2 parejas para generar las jornadas.");

  const { data: league, error: leagueError } = await supabase.from("leagues").select("start_date, end_date").eq("id", leagueId).single();
  if (leagueError) throw new Error(leagueError.message);

  const teamIds = teams.map((t) => t.teamId);
  const schedule = generateRoundRobinSchedule(teamIds);
  const windows = computeRoundWindows(league.start_date, league.end_date, schedule.length);

  for (let i = 0; i < schedule.length; i++) {
    const { data: round, error: roundError } = await supabase
      .from("league_rounds")
      .insert({ category_id: categoryId, order_index: i, window_start: windows[i].windowStart, window_end: windows[i].windowEnd })
      .select("id")
      .single();
    if (roundError) throw new Error(roundError.message);

    const { matches } = schedule[i];
    if (matches.length === 0) continue;

    const rows = matches.map(([teamAId, teamBId], slotIndex) => ({
      league_id: leagueId,
      league_round_id: round.id,
      round_index: slotIndex,
      team_a_id: teamAId,
      team_b_id: teamBId,
      status: "SCHEDULED" as const,
      match_type: "LEAGUE" as const,
    }));
    const { error: matchesError } = await supabase.from("matches").insert(rows);
    if (matchesError) throw new Error(matchesError.message);
  }
}

export async function fetchLeagueMatchesForCategory(categoryId: string): Promise<LeagueMatchView[]> {
  const supabase = await createClient();
  const { data: rounds } = await supabase.from("league_rounds").select("id").eq("category_id", categoryId);
  const roundIds = (rounds ?? []).map((r) => r.id);
  if (roundIds.length === 0) return [];

  const { data, error } = await supabase
    .from("matches")
    .select(
      `id, league_round_id, status, winner_team_id,
       team_a:teams!matches_team_a_id_fkey(id, team_members(players(id, first_name, last_name))),
       team_b:teams!matches_team_b_id_fkey(id, team_members(players(id, first_name, last_name))),
       set_scores(set_number, team_a_games, team_b_games, tiebreak_a, tiebreak_b)`
    )
    .in("league_round_id", roundIds)
    .order("round_index");
  if (error) throw new Error(error.message);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function toTeamView(team: any): MatchTeamView | null {
    if (!team) return null;
    const members = (team.team_members ?? []) as { players: { id: string; first_name: string; last_name: string } | null }[];
    return {
      teamId: team.id,
      players: members.filter((m) => m.players).map((m) => ({ playerId: m.players!.id, firstName: m.players!.first_name, lastName: m.players!.last_name })),
    };
  }

  interface SetScoreRow {
    set_number: number;
    team_a_games: number;
    team_b_games: number;
    tiebreak_a: number | null;
    tiebreak_b: number | null;
  }

  return (data ?? []).map((m) => ({
    id: m.id,
    roundId: m.league_round_id!,
    teamA: toTeamView(m.team_a),
    teamB: toTeamView(m.team_b),
    status: m.status,
    winnerTeamId: m.winner_team_id,
    sets: [...((m.set_scores as unknown as SetScoreRow[]) ?? [])]
      .sort((a, b) => a.set_number - b.set_number)
      .map((s) => ({ setNumber: s.set_number, teamAGames: s.team_a_games, teamBGames: s.team_b_games, tiebreakA: s.tiebreak_a, tiebreakB: s.tiebreak_b })),
  }));
}
