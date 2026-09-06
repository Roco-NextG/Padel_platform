import { calculateStandings } from "@padel-platform/tournament-engine";
import { createClient } from "@/lib/supabase/server";
import { toMatchResult, type SetRow } from "@/modules/tournaments/infrastructure/bracketRepository";
import { fetchTeamsForLeagueCategory } from "./leagueEnrollmentRepository";
import type { LeagueStandingsEntry, FormResult } from "../domain/standings";

export interface LeagueRoundView {
  id: string;
  orderIndex: number;
  windowStart: string | null;
  windowEnd: string | null;
  /** true si TODOS los partidos de esta jornada ya están CONFIRMED. */
  played: boolean;
}

export async function fetchLeagueRounds(categoryId: string): Promise<LeagueRoundView[]> {
  const supabase = await createClient();
  const { data: rounds, error } = await supabase
    .from("league_rounds")
    .select("id, order_index, window_start, window_end")
    .eq("category_id", categoryId)
    .order("order_index");
  if (error) throw new Error(error.message);
  if (!rounds || rounds.length === 0) return [];

  const roundIds = rounds.map((r) => r.id);
  const { data: matches } = await supabase.from("matches").select("league_round_id, status").in("league_round_id", roundIds);

  const statusesByRound = new Map<string, string[]>();
  for (const m of matches ?? []) {
    if (!m.league_round_id) continue;
    const list = statusesByRound.get(m.league_round_id) ?? [];
    list.push(m.status);
    statusesByRound.set(m.league_round_id, list);
  }

  return rounds.map((r) => {
    const statuses = statusesByRound.get(r.id) ?? [];
    return {
      id: r.id,
      orderIndex: r.order_index,
      windowStart: r.window_start,
      windowEnd: r.window_end,
      played: statuses.length > 0 && statuses.every((s) => s === "CONFIRMED"),
    };
  });
}

/**
 * Tabla de posiciones de temporada de una categoría de Liga — acumulada
 * sobre TODAS las jornadas generadas, no una por jornada. Reutiliza
 * calculateStandings (packages/tournament-engine) tal cual, la misma
 * función que usa el cuadro de Torneo — sin una segunda implementación del
 * cálculo. "form" es un dato derivado liviano aparte (últimos resultados en
 * orden cronológico), no una segunda fuente de verdad para PG/sets/games.
 */
export async function fetchLeagueStandings(categoryId: string): Promise<LeagueStandingsEntry[]> {
  const supabase = await createClient();
  const [teams, { data: rounds }] = await Promise.all([
    fetchTeamsForLeagueCategory(categoryId),
    supabase.from("league_rounds").select("id, order_index").eq("category_id", categoryId).order("order_index"),
  ]);
  if (!rounds || rounds.length === 0) return [];

  const roundIds = rounds.map((r) => r.id);
  const orderByRoundId = new Map(rounds.map((r) => [r.id, r.order_index]));

  const { data: matches, error } = await supabase
    .from("matches")
    .select("league_round_id, team_a_id, team_b_id, winner_team_id, status, set_scores(team_a_games, team_b_games)")
    .in("league_round_id", roundIds);
  if (error) throw new Error(error.message);

  const teamIds = teams.map((t) => t.teamId);
  const teamLabelById = new Map(teams.map((t) => [t.teamId, t.players.map((p) => `${p.firstName} ${p.lastName}`.trim()).join(" / ")]));

  const confirmedMatches = (matches ?? [])
    .filter(
      (m): m is typeof m & { team_a_id: string; team_b_id: string; winner_team_id: string; league_round_id: string } =>
        m.status === "CONFIRMED" && !!m.team_a_id && !!m.team_b_id && !!m.winner_team_id && !!m.league_round_id
    )
    .sort((a, b) => (orderByRoundId.get(a.league_round_id) ?? 0) - (orderByRoundId.get(b.league_round_id) ?? 0));

  const results = confirmedMatches.map((m) => toMatchResult({ ...m, set_scores: m.set_scores as unknown as SetRow[] }));
  const standings = calculateStandings(teamIds, results);

  const formByTeam = new Map<string, FormResult[]>();
  for (const m of confirmedMatches) {
    for (const teamId of [m.team_a_id, m.team_b_id]) {
      const list = formByTeam.get(teamId) ?? [];
      list.push(m.winner_team_id === teamId ? "W" : "L");
      formByTeam.set(teamId, list);
    }
  }

  return standings.map((s) => ({
    ...s,
    teamLabel: teamLabelById.get(s.teamId) ?? "?",
    form: formByTeam.get(s.teamId) ?? [],
  }));
}
