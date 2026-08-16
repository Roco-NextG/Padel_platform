import { createClient } from "@/lib/supabase/server";
import type { Database, DbMatchType, GenderType, PhaseType } from "@/lib/supabase/database.types";
import type { MatchResult } from "@padel-platform/tournament-engine";

type MatchRow = Database["public"]["Tables"]["matches"]["Row"];
type TournamentRow = Database["public"]["Tables"]["tournaments"]["Row"];
type PhaseRow = Database["public"]["Tables"]["tournament_phases"]["Row"];
type TournamentGroupRow = Database["public"]["Tables"]["tournament_groups"]["Row"];

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
  usesGroupStage: boolean;
  teamCount: number;
  hasGroups: boolean;
  allGroupMatchesConfirmed: boolean;
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
  const [teamsResult, phasesResult, groupsResult] = await Promise.all([
    supabase.from("teams").select("id, tournament_category_id").in("tournament_category_id", categoryIds),
    supabase.from("tournament_phases").select("category_id, type").in("category_id", categoryIds),
    supabase.from("tournament_groups").select("id, category_id").in("category_id", categoryIds),
  ]);
  if (teamsResult.error) throw new Error(teamsResult.error.message);
  if (phasesResult.error) throw new Error(phasesResult.error.message);
  if (groupsResult.error) throw new Error(groupsResult.error.message);

  const teamCountByCategory = new Map<string, number>();
  for (const t of teamsResult.data ?? []) {
    if (!t.tournament_category_id) continue;
    teamCountByCategory.set(
      t.tournament_category_id,
      (teamCountByCategory.get(t.tournament_category_id) ?? 0) + 1
    );
  }

  // hasBracket = existe alguna fase de RONDA (no la fase GROUPS) — con fase
  // de grupos, la categoría siempre tiene AL MENOS la fase GROUPS antes de
  // tener bracket, así que "cualquier fase" ya no alcanza para distinguir.
  const categoriesWithBracketPhase = new Set(
    (phasesResult.data ?? []).filter((p) => p.type !== "GROUPS").map((p) => p.category_id)
  );

  const groupIdsByCategory = new Map<string, string[]>();
  for (const g of groupsResult.data ?? []) {
    const list = groupIdsByCategory.get(g.category_id) ?? [];
    list.push(g.id);
    groupIdsByCategory.set(g.category_id, list);
  }

  const allGroupIds = (groupsResult.data ?? []).map((g) => g.id);
  const groupIdsWithUnconfirmedMatches = new Set<string>();
  if (allGroupIds.length > 0) {
    const { data: unconfirmed, error: unconfirmedError } = await supabase
      .from("matches")
      .select("group_id")
      .in("group_id", allGroupIds)
      .neq("status", "CONFIRMED");
    if (unconfirmedError) throw new Error(unconfirmedError.message);
    for (const m of unconfirmed ?? []) {
      if (m.group_id) groupIdsWithUnconfirmedMatches.add(m.group_id);
    }
  }

  return categories.map((c) => {
    const groupIds = groupIdsByCategory.get(c.id) ?? [];
    const hasGroups = groupIds.length > 0;
    return {
      id: c.id,
      name: c.name,
      level: c.level,
      genderRestriction: c.gender_restriction,
      maxTeams: c.max_teams,
      usesGroupStage: c.uses_group_stage,
      teamCount: teamCountByCategory.get(c.id) ?? 0,
      hasGroups,
      allGroupMatchesConfirmed:
        hasGroups && groupIds.every((id) => !groupIdsWithUnconfirmedMatches.has(id)),
      hasBracket: categoriesWithBracketPhase.has(c.id),
    };
  });
}

export async function fetchTeamNames(teamIds: string[]): Promise<Map<string, string>> {
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
  // La fase GROUPS (si existe) es round-robin, no una ronda de bracket — sus
  // Match tienen round_index null para todos, así que nunca deben entrar en
  // este cálculo de "ronda 1, ronda 2, ..." (eso rompería la numeración de
  // casillas y produciría una columna entera de "Por definir" fantasma).
  const phases = (await fetchPhasesForCategory(categoryId)).filter((p) => p.type !== "GROUPS");
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

export interface CategoryContext {
  tournamentId: string;
  usesGroupStage: boolean;
}

export async function fetchCategoryContext(categoryId: string): Promise<CategoryContext | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_categories")
    .select("tournament_id, uses_group_stage")
    .eq("id", categoryId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { tournamentId: data.tournament_id, usesGroupStage: data.uses_group_stage };
}

/** Directo vía RLS (`tournament_groups_write`, is_tournament_manager) — la formación de grupos siempre la dispara el organizador. */
export async function insertGroups(
  categoryId: string,
  names: string[]
): Promise<Pick<TournamentGroupRow, "id" | "name">[]> {
  if (names.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_groups")
    .insert(names.map((name) => ({ category_id: categoryId, name })))
    .select("id, name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchGroupsForCategory(
  categoryId: string
): Promise<Pick<TournamentGroupRow, "id" | "name">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_groups")
    .select("id, name")
    .eq("category_id", categoryId)
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchTeamsForGroup(groupId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("teams").select("id").eq("group_id", groupId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((t) => t.id);
}

/**
 * UPDATE real por equipo — no upsert. `teams_write`'s WITH CHECK exige
 * `tournament_category_id` para resolver is_tournament_manager(); un upsert
 * evalúa esa política contra la fila CANDIDATA del INSERT (columnas no
 * incluidas quedan en NULL, no en su valor ya guardado), así que rechaza
 * cualquier upsert que no repita `tournament_category_id` en el payload. Un
 * UPDATE real solo cambia `group_id` y evalúa la política contra la fila que
 * ya existe, con su `tournament_category_id` real intacto.
 */
export async function updateTeamGroups(
  assignments: { teamId: string; groupId: string }[]
): Promise<void> {
  if (assignments.length === 0) return;
  const supabase = await createClient();
  const results = await Promise.all(
    assignments.map((a) => supabase.from("teams").update({ group_id: a.groupId }).eq("id", a.teamId))
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

export interface GroupMatchInsert {
  tournamentId: string;
  phaseId: string;
  groupId: string;
  teamAId: string;
  teamBId: string;
  matchType: DbMatchType;
}

/** Directo vía RLS (`matches_write`) — igual que insertMatches, disparado solo por el organizador. round_index queda null: no tiene significado para un partido de grupo. */
export async function insertGroupMatches(rows: GroupMatchInsert[]): Promise<MatchRow[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .insert(
      rows.map((r) => ({
        tournament_id: r.tournamentId,
        phase_id: r.phaseId,
        group_id: r.groupId,
        team_a_id: r.teamAId,
        team_b_id: r.teamBId,
        match_type: r.matchType,
      }))
    )
    .select("*");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** true si el grupo (o la categoría entera) todavía no tiene ningún Match sin confirmar — sin partidos, se considera que faltan grupos, no que ya terminaron. */
export async function areAllGroupMatchesConfirmed(categoryId: string): Promise<boolean> {
  const groups = await fetchGroupsForCategory(categoryId);
  if (groups.length === 0) return false;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("id")
    .in(
      "group_id",
      groups.map((g) => g.id)
    )
    .neq("status", "CONFIRMED")
    .limit(1);
  if (error) throw new Error(error.message);
  return (data ?? []).length === 0;
}

/** Arma el MatchResult[] que calculateStandings() espera, a partir de los Match CONFIRMED de un grupo y sus SetScore — nunca se inventa un resultado, un Match sin winner_team_id o sin equipos asignados simplemente no entra en el cálculo. */
export async function fetchConfirmedGroupMatchResults(groupId: string): Promise<MatchResult[]> {
  const supabase = await createClient();
  const { data: matches, error } = await supabase
    .from("matches")
    .select("id, team_a_id, team_b_id, winner_team_id")
    .eq("group_id", groupId)
    .eq("status", "CONFIRMED");
  if (error) throw new Error(error.message);
  if (!matches || matches.length === 0) return [];

  const { data: sets, error: setsError } = await supabase
    .from("set_scores")
    .select("match_id, team_a_games, team_b_games")
    .in(
      "match_id",
      matches.map((m) => m.id)
    );
  if (setsError) throw new Error(setsError.message);

  return matches
    .filter(
      (m): m is typeof m & { team_a_id: string; team_b_id: string; winner_team_id: string } =>
        m.team_a_id != null && m.team_b_id != null && m.winner_team_id != null
    )
    .map((m) => {
      const matchSets = (sets ?? []).filter((s) => s.match_id === m.id);
      return {
        teamAId: m.team_a_id,
        teamBId: m.team_b_id,
        winnerId: m.winner_team_id,
        setsWonA: matchSets.filter((s) => s.team_a_games > s.team_b_games).length,
        setsWonB: matchSets.filter((s) => s.team_b_games > s.team_a_games).length,
        gamesWonA: matchSets.reduce((sum, s) => sum + s.team_a_games, 0),
        gamesWonB: matchSets.reduce((sum, s) => sum + s.team_b_games, 0),
      };
    });
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
