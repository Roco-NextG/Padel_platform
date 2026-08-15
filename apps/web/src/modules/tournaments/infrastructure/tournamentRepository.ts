import { createClient } from "@/lib/supabase/server";
import type { Database, DbMatchType, GenderType, PhaseType } from "@/lib/supabase/database.types";

type MatchRow = Database["public"]["Tables"]["matches"]["Row"];
type TournamentRow = Database["public"]["Tables"]["tournaments"]["Row"];
type PhaseRow = Database["public"]["Tables"]["tournament_phases"]["Row"];

/** RLS ya scopea esto a lo que el caller administra + torneos publicados — misma lógica que fetchOrganizerMatches. */
export async function fetchTournamentsForOrganizerView(): Promise<TournamentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchTournamentById(id: string): Promise<TournamentRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tournaments").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export interface CategorySummary {
  id: string;
  name: string;
  level: string | null;
  genderRestriction: GenderType | null;
  maxTeams: number | null;
  teamCount: number;
  hasBracket: boolean;
}

export async function fetchCategoriesWithSummary(tournamentId: string): Promise<CategorySummary[]> {
  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("tournament_categories")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("created_at");
  if (error) throw new Error(error.message);
  if (!categories || categories.length === 0) return [];

  const categoryIds = categories.map((c) => c.id);
  const [teamsResult, phasesResult] = await Promise.all([
    supabase.from("teams").select("id, tournament_category_id").in("tournament_category_id", categoryIds),
    supabase.from("tournament_phases").select("category_id").in("category_id", categoryIds),
  ]);
  if (teamsResult.error) throw new Error(teamsResult.error.message);
  if (phasesResult.error) throw new Error(phasesResult.error.message);

  const teamCountByCategory = new Map<string, number>();
  for (const t of teamsResult.data ?? []) {
    if (!t.tournament_category_id) continue;
    teamCountByCategory.set(
      t.tournament_category_id,
      (teamCountByCategory.get(t.tournament_category_id) ?? 0) + 1
    );
  }
  const categoriesWithPhases = new Set((phasesResult.data ?? []).map((p) => p.category_id));

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    level: c.level,
    genderRestriction: c.gender_restriction,
    maxTeams: c.max_teams,
    teamCount: teamCountByCategory.get(c.id) ?? 0,
    hasBracket: categoriesWithPhases.has(c.id),
  }));
}

async function fetchTeamNames(teamIds: string[]): Promise<Map<string, string>> {
  if (teamIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("team_members")
    .select("team_id, player_id")
    .in("team_id", teamIds);
  if (error) throw new Error(error.message);

  const playerIds = Array.from(new Set((members ?? []).map((m) => m.player_id)));
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, first_name")
    .in("id", playerIds.length > 0 ? playerIds : [""]);
  if (playersError) throw new Error(playersError.message);
  const firstNameById = new Map((players ?? []).map((p) => [p.id, p.first_name]));

  const names = new Map<string, string>();
  for (const teamId of teamIds) {
    const label = (members ?? [])
      .filter((m) => m.team_id === teamId)
      .map((m) => firstNameById.get(m.player_id) ?? "?")
      .join(" / ");
    names.set(teamId, label || "Equipo");
  }
  return names;
}

export interface BracketDisplayMatch {
  matchIndex: number;
  /** null = todavía no hay Match persistido para esta casilla (falta que se resuelva el cruce anterior). */
  status: MatchRow["status"] | null;
  teamAId: string | null;
  teamBId: string | null;
  teamAName: string | null;
  teamBName: string | null;
  winnerTeamId: string | null;
}

export interface BracketDisplayRound {
  roundNumber: number;
  type: PhaseType;
  matches: BracketDisplayMatch[];
}

/** Reconstruye la vista completa del cuadro (todas las rondas) para mostrar de solo lectura — casillas aún no resueltas se muestran vacías ("Por definir"), nunca se inventa un Match que no existe en la base. */
export async function fetchBracketForCategory(categoryId: string): Promise<BracketDisplayRound[]> {
  const phases = await fetchPhasesForCategory(categoryId);
  if (phases.length === 0) return [];

  const supabase = await createClient();
  const { data: matches, error } = await supabase
    .from("matches")
    .select("phase_id, round_index, team_a_id, team_b_id, status, winner_team_id")
    .in(
      "phase_id",
      phases.map((p) => p.id)
    );
  if (error) throw new Error(error.message);

  const round1MatchCount = (matches ?? []).filter((m) => m.phase_id === phases[0].id).length;

  const teamIds = Array.from(
    new Set(
      (matches ?? [])
        .flatMap((m) => [m.team_a_id, m.team_b_id])
        .filter((id): id is string => id != null)
    )
  );
  const teamNames = await fetchTeamNames(teamIds);

  return phases.map((phase, roundOffset) => {
    const matchesInRound = Math.max(1, Math.round(round1MatchCount / Math.pow(2, roundOffset)));
    const byRoundIndex = new Map(
      (matches ?? []).filter((m) => m.phase_id === phase.id).map((m) => [m.round_index, m])
    );

    const displayMatches: BracketDisplayMatch[] = Array.from({ length: matchesInRound }, (_, matchIndex) => {
      const m = byRoundIndex.get(matchIndex);
      if (!m) {
        return {
          matchIndex,
          status: null,
          teamAId: null,
          teamBId: null,
          teamAName: null,
          teamBName: null,
          winnerTeamId: null,
        };
      }
      return {
        matchIndex,
        status: m.status,
        teamAId: m.team_a_id,
        teamBId: m.team_b_id,
        teamAName: m.team_a_id ? teamNames.get(m.team_a_id) ?? "Equipo" : null,
        teamBName: m.team_b_id ? teamNames.get(m.team_b_id) ?? "Equipo" : null,
        winnerTeamId: m.winner_team_id,
      };
    });

    return { roundNumber: phase.order_index, type: phase.type, matches: displayMatches };
  });
}

export async function fetchCategoryTournamentId(categoryId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_categories")
    .select("tournament_id")
    .eq("id", categoryId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.tournament_id ?? null;
}

/** Todo equipo inscrito en la categoría — sin fase de grupos, "inscrito" es la única noción de participante. */
export async function fetchEnrolledTeams(
  categoryId: string
): Promise<{ teamId: string; organizerSeed: number | null }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, seed")
    .eq("tournament_category_id", categoryId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((t) => ({ teamId: t.id, organizerSeed: t.seed }));
}

/** Directo vía RLS (`tournament_phases_write`, is_tournament_manager) — la generación siempre la dispara el organizador. */
export async function insertPhases(
  categoryId: string,
  rounds: { type: PhaseType; orderIndex: number }[]
): Promise<PhaseRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_phases")
    .insert(
      rounds.map((r) => ({ category_id: categoryId, type: r.type, order_index: r.orderIndex }))
    )
    .select("*");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchPhasesForCategory(categoryId: string): Promise<PhaseRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_phases")
    .select("*")
    .eq("category_id", categoryId)
    .order("order_index");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface BracketMatchInsert {
  tournamentId: string;
  phaseId: string;
  roundIndex: number;
  teamAId: string | null;
  teamBId: string | null;
  status: "SCHEDULED" | "CONFIRMED";
  winnerTeamId: string | null;
  matchType: DbMatchType;
}

/** Directo vía RLS (`matches_write`) — usado en generación (ronda 1 + cascada de byes ya resuelta en memoria, sin condición de carrera posible). */
export async function insertMatches(rows: BracketMatchInsert[]): Promise<MatchRow[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .insert(
      rows.map((r) => ({
        tournament_id: r.tournamentId,
        phase_id: r.phaseId,
        round_index: r.roundIndex,
        team_a_id: r.teamAId,
        team_b_id: r.teamBId,
        status: r.status,
        winner_team_id: r.winnerTeamId,
        match_type: r.matchType,
      }))
    )
    .select("*");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface BracketMatchContext {
  id: string;
  tournamentId: string | null;
  phaseId: string | null;
  roundIndex: number | null;
  status: string;
  winnerTeamId: string | null;
}

export async function fetchMatchBracketContext(matchId: string): Promise<BracketMatchContext | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("id, tournament_id, phase_id, round_index, status, winner_team_id")
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    tournamentId: data.tournament_id,
    phaseId: data.phase_id,
    roundIndex: data.round_index,
    status: data.status,
    winnerTeamId: data.winner_team_id,
  };
}

export async function fetchPhase(phaseId: string): Promise<PhaseRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_phases")
    .select("*")
    .eq("id", phaseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** El partido ya confirmado (o bye) en `(phaseId, roundIndex)`, si existe — es la única "memoria" que necesitamos del lado hermano de un cruce. */
export async function fetchConfirmedMatchAtSlot(
  phaseId: string,
  roundIndex: number
): Promise<{ status: string; winnerTeamId: string | null } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("status, winner_team_id")
    .eq("phase_id", phaseId)
    .eq("round_index", roundIndex)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { status: data.status, winnerTeamId: data.winner_team_id };
}

export async function createBracketMatchRpc(input: {
  tournamentId: string;
  phaseId: string;
  roundIndex: number;
  teamAId: string;
  teamBId: string;
  matchType: DbMatchType;
  completedMatchId: string;
}): Promise<MatchRow> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_bracket_match", {
    p_tournament_id: input.tournamentId,
    p_phase_id: input.phaseId,
    p_round_index: input.roundIndex,
    p_team_a_id: input.teamAId,
    p_team_b_id: input.teamBId,
    p_match_type: input.matchType,
    p_completed_match_id: input.completedMatchId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function finishTournamentRpc(input: {
  tournamentId: string;
  completedMatchId: string;
}): Promise<TournamentRow> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finish_tournament", {
    p_tournament_id: input.tournamentId,
    p_completed_match_id: input.completedMatchId,
  });
  if (error) throw new Error(error.message);
  return data;
}
