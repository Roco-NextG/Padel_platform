import {
  balancedSeeding,
  calculateStandings,
  distributeIntoGroups,
  earliestPossibleRound,
  generateBracket,
  generateGroupMatches,
  type GroupStanding,
  type MatchResult,
  type SeededTeam,
} from "@padel-platform/tournament-engine";
import { RATING_CONFIG } from "@padel-platform/rating-engine";
import { createClient } from "@/lib/supabase/server";
import { fetchTeamsForCategory } from "./enrollmentRepository";
import { phaseTypeForRound, type BracketRoundView, type BracketTeamInfo } from "../domain/bracket";

interface SetRow {
  team_a_games: number;
  team_b_games: number;
}

function toMatchResult(m: { team_a_id: string; team_b_id: string; winner_team_id: string; set_scores: SetRow[] }): MatchResult {
  let setsWonA = 0;
  let setsWonB = 0;
  let gamesWonA = 0;
  let gamesWonB = 0;
  for (const s of m.set_scores) {
    gamesWonA += s.team_a_games;
    gamesWonB += s.team_b_games;
    if (s.team_a_games > s.team_b_games) setsWonA++;
    else setsWonB++;
  }
  return { teamAId: m.team_a_id, teamBId: m.team_b_id, winnerId: m.winner_team_id, setsWonA, setsWonB, gamesWonA, gamesWonB };
}

export async function generateGroupStage(tournamentId: string, categoryId: string): Promise<void> {
  const supabase = await createClient();

  const { data: existing } = await supabase.from("tournament_phases").select("id").eq("category_id", categoryId).eq("type", "GROUPS").maybeSingle();
  if (existing) throw new Error("Ya se generó la fase de grupos para esta categoría.");

  const teams = await fetchTeamsForCategory(categoryId);
  if (teams.length < 3) throw new Error("Se necesitan al menos 3 parejas para armar grupos.");

  const groupsByName = distributeIntoGroups(
    teams.map((t) => ({ id: t.teamId })),
    4
  );

  const { data: phase, error: phaseError } = await supabase
    .from("tournament_phases")
    .insert({ category_id: categoryId, type: "GROUPS", order_index: 0 })
    .select("id")
    .single();
  if (phaseError) throw new Error(phaseError.message);

  let roundIndexCounter = 0;
  for (const [groupName, teamIds] of Object.entries(groupsByName)) {
    const { data: group, error: groupError } = await supabase
      .from("tournament_groups")
      .insert({ category_id: categoryId, name: groupName })
      .select("id")
      .single();
    if (groupError) throw new Error(groupError.message);

    const { error: teamsUpdateError } = await supabase.from("teams").update({ group_id: group.id }).in("id", teamIds);
    if (teamsUpdateError) throw new Error(teamsUpdateError.message);

    const pairs = generateGroupMatches(teamIds);
    if (pairs.length === 0) continue;

    const rows = pairs.map(([a, b]) => ({
      tournament_id: tournamentId,
      phase_id: phase.id,
      group_id: group.id,
      round_index: roundIndexCounter++,
      team_a_id: a,
      team_b_id: b,
      status: "SCHEDULED" as const,
      match_type: "TOURNAMENT" as const,
    }));
    const { error: matchesError } = await supabase.from("matches").insert(rows);
    if (matchesError) throw new Error(matchesError.message);
  }
}

export interface GroupStandingsView {
  groupId: string;
  groupName: string;
  standings: (GroupStanding & { teamLabel: string })[];
}

export async function fetchGroupStandings(categoryId: string): Promise<GroupStandingsView[]> {
  const supabase = await createClient();
  const { data: phase } = await supabase.from("tournament_phases").select("id").eq("category_id", categoryId).eq("type", "GROUPS").maybeSingle();
  if (!phase) return [];

  const [{ data: groups }, { data: teamsInGroups }, { data: matches }, teams] = await Promise.all([
    supabase.from("tournament_groups").select("id, name").eq("category_id", categoryId).order("name"),
    supabase.from("teams").select("id, group_id").eq("tournament_category_id", categoryId).not("group_id", "is", null),
    supabase
      .from("matches")
      .select("id, group_id, team_a_id, team_b_id, winner_team_id, status, set_scores(team_a_games, team_b_games)")
      .eq("phase_id", phase.id),
    fetchTeamsForCategory(categoryId),
  ]);

  const teamLabelById = new Map(
    teams.map((t) => [t.teamId, t.players.map((p) => `${p.firstName} ${p.lastName}`.trim()).join(" / ")])
  );

  return (groups ?? []).map((g) => {
    const teamIds = (teamsInGroups ?? []).filter((t) => t.group_id === g.id).map((t) => t.id);
    const results = (matches ?? [])
      .filter((m): m is typeof m & { team_a_id: string; team_b_id: string; winner_team_id: string } =>
        m.group_id === g.id && m.status === "CONFIRMED" && !!m.team_a_id && !!m.team_b_id && !!m.winner_team_id
      )
      .map((m) => toMatchResult({ ...m, set_scores: m.set_scores as unknown as SetRow[] }));
    const standings = calculateStandings(teamIds, results).map((s) => ({
      ...s,
      teamLabel: teamLabelById.get(s.teamId) ?? "?",
    }));
    return { groupId: g.id, groupName: g.name, standings };
  });
}

export async function generateBracketForCategory(tournamentId: string, categoryId: string): Promise<void> {
  const supabase = await createClient();

  const { data: category, error: categoryError } = await supabase
    .from("tournament_categories")
    .select("uses_group_stage")
    .eq("id", categoryId)
    .single();
  if (categoryError) throw new Error(categoryError.message);

  const { data: existingBracketPhase } = await supabase
    .from("tournament_phases")
    .select("id")
    .eq("category_id", categoryId)
    .neq("type", "GROUPS")
    .limit(1)
    .maybeSingle();
  if (existingBracketPhase) throw new Error("Ya se generó el cuadro para esta categoría.");

  const teams = await fetchTeamsForCategory(categoryId);
  if (teams.length < 2) throw new Error("Se necesitan al menos 2 parejas para generar el cuadro.");

  let seededTeams: SeededTeam[];

  if (category.uses_group_stage) {
    const { data: groupsPhase } = await supabase.from("tournament_phases").select("id").eq("category_id", categoryId).eq("type", "GROUPS").maybeSingle();
    if (!groupsPhase) throw new Error("Generá primero la fase de grupos.");

    const [{ data: groups }, { data: teamsInGroups }, { data: matches }] = await Promise.all([
      supabase.from("tournament_groups").select("id").eq("category_id", categoryId),
      supabase.from("teams").select("id, group_id").eq("tournament_category_id", categoryId).not("group_id", "is", null),
      supabase
        .from("matches")
        .select("id, group_id, team_a_id, team_b_id, winner_team_id, status, set_scores(team_a_games, team_b_games)")
        .eq("phase_id", groupsPhase.id),
    ]);

    if ((matches ?? []).some((m) => m.status !== "CONFIRMED")) {
      throw new Error("Todavía hay partidos de grupos sin confirmar.");
    }

    const standingsByGroup: Record<string, GroupStanding[]> = {};
    for (const g of groups ?? []) {
      const teamIds = (teamsInGroups ?? []).filter((t) => t.group_id === g.id).map((t) => t.id);
      const results = (matches ?? [])
        .filter((m): m is typeof m & { team_a_id: string; team_b_id: string; winner_team_id: string } =>
          m.group_id === g.id && !!m.team_a_id && !!m.team_b_id && !!m.winner_team_id
        )
        .map((m) => toMatchResult({ ...m, set_scores: m.set_scores as unknown as SetRow[] }));
      standingsByGroup[g.id] = calculateStandings(teamIds, results);
    }
    seededTeams = balancedSeeding(standingsByGroup);
  } else {
    const { data: teamRatings } = await supabase
      .from("teams")
      .select("id, team_members(players(current_rating))")
      .eq("tournament_category_id", categoryId);

    const avgRating = new Map<string, number>();
    for (const t of teamRatings ?? []) {
      const members = t.team_members as unknown as { players: { current_rating: number | null } | null }[];
      const ratings = members.map((m) => m.players?.current_rating ?? RATING_CONFIG.DEFAULT_RATING);
      avgRating.set(t.id, ratings.reduce((a, b) => a + b, 0) / (ratings.length || 1));
    }

    seededTeams = teams
      .map((t) => ({ teamId: t.teamId, rating: avgRating.get(t.teamId) ?? RATING_CONFIG.DEFAULT_RATING }))
      .sort((a, b) => b.rating - a.rating)
      .map((t, i) => ({ teamId: t.teamId, groupId: null, seed: i + 1 }));
  }

  const bracket = generateBracket(seededTeams);
  const totalRounds = Math.log2(bracket.bracketSize);

  const phaseRows = Array.from({ length: totalRounds }, (_, i) => ({
    category_id: categoryId,
    type: phaseTypeForRound(i + 1, totalRounds),
    order_index: i + 1,
  }));
  const { data: phases, error: phasesError } = await supabase.from("tournament_phases").insert(phaseRows).select("id, order_index");
  if (phasesError) throw new Error(phasesError.message);
  const round1PhaseId = phases.find((p) => p.order_index === 1)!.id;

  for (const st of seededTeams) {
    await supabase.from("teams").update({ seed: st.seed }).eq("id", st.teamId);
  }

  const round1Rows = bracket.firstRoundMatches.map((m) =>
    m.isByeMatch
      ? {
          tournament_id: tournamentId,
          phase_id: round1PhaseId,
          round_index: m.position,
          team_a_id: m.autoAdvanceTeamId,
          team_b_id: null,
          status: "CONFIRMED" as const,
          winner_team_id: m.autoAdvanceTeamId,
          match_type: "TOURNAMENT" as const,
        }
      : {
          tournament_id: tournamentId,
          phase_id: round1PhaseId,
          round_index: m.position,
          team_a_id: m.teamAId,
          team_b_id: m.teamBId,
          status: "SCHEDULED" as const,
          winner_team_id: null,
          match_type: "TOURNAMENT" as const,
        }
  );
  const { error: round1Error } = await supabase.from("matches").insert(round1Rows);
  if (round1Error) throw new Error(round1Error.message);

  await reconcileBracket(tournamentId, categoryId);
}

/**
 * Recalcula el cuadro desde la fuente de verdad (matches confirmados) en vez
 * de reconstruir estado en memoria con bracketProgression.ts — cada bye de
 * ronda 1 ya se persiste como un match CONFIRMED sin team_b_id (ver arriba),
 * así que "avanzar" es siempre lo mismo: dos matches CONFIRMED consecutivos
 * de una ronda alimentan un match de la siguiente, creado vía
 * create_bracket_match una sola vez que ambos lados se conocen (nunca antes
 * — evita el upsert no-op de esa RPC en un conflicto parcial).
 */
export async function reconcileBracket(tournamentId: string, categoryId: string): Promise<{ finished: boolean }> {
  const supabase = await createClient();
  const { data: phases, error: phasesError } = await supabase
    .from("tournament_phases")
    .select("id, order_index")
    .eq("category_id", categoryId)
    .neq("type", "GROUPS")
    .order("order_index");
  if (phasesError) throw new Error(phasesError.message);
  if (!phases || phases.length === 0) return { finished: false };

  const phaseIds = phases.map((p) => p.id);
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id, phase_id, round_index, status, winner_team_id")
    .in("phase_id", phaseIds);
  if (matchesError) throw new Error(matchesError.message);

  const byKey = new Map((matches ?? []).map((m) => [`${m.phase_id}:${m.round_index}`, m]));
  const totalRounds = phases.length;

  for (let round = 1; round < totalRounds; round++) {
    const currentPhase = phases.find((p) => p.order_index === round)!;
    const nextPhase = phases.find((p) => p.order_index === round + 1)!;
    const matchesInRound = (matches ?? []).filter((m) => m.phase_id === currentPhase.id);
    const maxIndex = Math.max(-1, ...matchesInRound.map((m) => m.round_index ?? -1));

    for (let i = 0; i * 2 + 1 <= maxIndex; i++) {
      const a = byKey.get(`${currentPhase.id}:${i * 2}`);
      const b = byKey.get(`${currentPhase.id}:${i * 2 + 1}`);
      if (!a || !b || a.status !== "CONFIRMED" || b.status !== "CONFIRMED" || !a.winner_team_id || !b.winner_team_id) continue;
      if (byKey.has(`${nextPhase.id}:${i}`)) continue;

      const { error } = await supabase.rpc("create_bracket_match", {
        p_tournament_id: tournamentId,
        p_phase_id: nextPhase.id,
        p_round_index: i,
        p_team_a_id: a.winner_team_id,
        p_team_b_id: b.winner_team_id,
        p_match_type: "TOURNAMENT",
        p_completed_match_id: null,
      });
      if (error) throw new Error(error.message);
    }
  }

  const finalPhase = phases[phases.length - 1];
  const finalMatch = (matches ?? []).find((m) => m.phase_id === finalPhase.id);
  if (finalMatch && finalMatch.status === "CONFIRMED" && finalMatch.winner_team_id) {
    const { error } = await supabase.rpc("finish_tournament", {
      p_tournament_id: tournamentId,
      p_completed_match_id: finalMatch.id,
    });
    if (error) throw new Error(error.message);
    return { finished: true };
  }

  return { finished: false };
}

export async function fetchBracketView(categoryId: string): Promise<BracketRoundView[]> {
  const supabase = await createClient();
  const { data: phases } = await supabase
    .from("tournament_phases")
    .select("id, type, order_index")
    .eq("category_id", categoryId)
    .neq("type", "GROUPS")
    .order("order_index");
  if (!phases || phases.length === 0) return [];

  const phaseIds = phases.map((p) => p.id);
  const [{ data: matches }, { data: teamSeeds }, teams] = await Promise.all([
    supabase.from("matches").select("id, phase_id, round_index, team_a_id, team_b_id, winner_team_id, status").in("phase_id", phaseIds).order("round_index"),
    supabase.from("teams").select("id, seed").eq("tournament_category_id", categoryId),
    fetchTeamsForCategory(categoryId),
  ]);

  const seedByTeam = new Map((teamSeeds ?? []).map((t) => [t.id, t.seed]));
  const teamById = new Map(teams.map((t) => [t.teamId, t]));

  function toTeamInfo(teamId: string | null): BracketTeamInfo | null {
    if (!teamId) return null;
    const t = teamById.get(teamId);
    return {
      teamId,
      players: (t?.players ?? []).map((p) => ({ firstName: p.firstName, lastName: p.lastName })),
      seed: seedByTeam.get(teamId) ?? null,
    };
  }

  return phases.map((phase) => ({
    phaseId: phase.id,
    type: phase.type,
    orderIndex: phase.order_index,
    matches: (matches ?? [])
      .filter((m) => m.phase_id === phase.id)
      .map((m) => ({
        matchId: m.id,
        roundIndex: m.round_index ?? 0,
        teamA: toTeamInfo(m.team_a_id),
        teamB: toTeamInfo(m.team_b_id),
        winnerTeamId: m.winner_team_id,
        status: m.status,
        isBye: !m.team_a_id || !m.team_b_id,
      })),
  }));
}

/**
 * Si el sembrado 1 y el sembrado 2 de la categoría podrían cruzarse antes
 * de la final dado el arreglo ACTUAL de la primera ronda — mismo cálculo
 * (earliestPossibleRound) que usa generateBracket() para separarlos al
 * generar el cuadro por primera vez, aplicado de nuevo después de un swap
 * manual para avisar (no bloquear) si el organizador rompió esa garantía.
 */
async function checkEarlySeedCollision(categoryId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: phases } = await supabase
    .from("tournament_phases")
    .select("id, order_index")
    .eq("category_id", categoryId)
    .neq("type", "GROUPS")
    .order("order_index");
  if (!phases || phases.length === 0) return null;

  const firstPhase = phases[0];
  const totalRounds = phases.length;

  const [{ data: round1Matches }, { data: teamSeeds }] = await Promise.all([
    supabase.from("matches").select("round_index, team_a_id, team_b_id").eq("phase_id", firstPhase.id),
    supabase.from("teams").select("id, seed").eq("tournament_category_id", categoryId).in("seed", [1, 2]),
  ]);

  const seed1TeamId = teamSeeds?.find((t) => t.seed === 1)?.id;
  const seed2TeamId = teamSeeds?.find((t) => t.seed === 2)?.id;
  if (!seed1TeamId || !seed2TeamId) return null;

  const positionByTeam = new Map<string, number>();
  for (const m of round1Matches ?? []) {
    const roundIndex = m.round_index ?? 0;
    if (m.team_a_id) positionByTeam.set(m.team_a_id, roundIndex * 2);
    if (m.team_b_id) positionByTeam.set(m.team_b_id, roundIndex * 2 + 1);
  }
  const pos1 = positionByTeam.get(seed1TeamId);
  const pos2 = positionByTeam.get(seed2TeamId);
  if (pos1 == null || pos2 == null || pos1 === pos2) return null;

  const earliest = earliestPossibleRound(pos1, pos2);
  if (earliest < totalRounds) {
    return "Con este cambio, el sembrado 1 y el sembrado 2 podrían enfrentarse antes de la final.";
  }
  return null;
}

export interface SwapBracketSlotsResult {
  warning: string | null;
}

/**
 * Intercambia dos equipos entre dos casillas de la PRIMERA fase generada del
 * cuadro (drag & drop del organizador) — solo si ambos partidos siguen
 * SCHEDULED (regla dura: no se puede reordenar un partido que ya empezó o
 * ya tiene resultado). No reemplaza el sistema de siembra — es un ajuste
 * manual sobre lo que ya generó generateBracketForCategory(); por eso
 * avisa (sin bloquear) si el resultado rompe la garantía de separar a los
 * dos mejores sembrados hasta la final.
 */
export async function swapBracketSlots(
  matchAId: string,
  sideA: "A" | "B",
  matchBId: string,
  sideB: "A" | "B"
): Promise<SwapBracketSlotsResult> {
  const supabase = await createClient();
  const { data: matches, error } = await supabase
    .from("matches")
    .select("id, phase_id, team_a_id, team_b_id, status")
    .in("id", [matchAId, matchBId]);
  if (error) throw new Error(error.message);

  const matchA = matches?.find((m) => m.id === matchAId);
  const matchB = matches?.find((m) => m.id === matchBId);
  if (!matchA || !matchB) throw new Error("No se encontró alguno de los dos partidos.");
  if (matchA.status !== "SCHEDULED" || matchB.status !== "SCHEDULED") {
    throw new Error("Solo se pueden intercambiar parejas de partidos que todavía no empezaron.");
  }
  if (!matchA.phase_id || matchA.phase_id !== matchB.phase_id) {
    throw new Error("Solo se pueden intercambiar parejas dentro de la misma fase.");
  }

  const { data: phase } = await supabase.from("tournament_phases").select("category_id, order_index").eq("id", matchA.phase_id).single();
  if (!phase || !phase.category_id || phase.order_index !== 1) {
    throw new Error("Solo se puede reordenar la primera fase del cuadro generado.");
  }

  const teamInA = sideA === "A" ? matchA.team_a_id : matchA.team_b_id;
  const teamInB = sideB === "A" ? matchB.team_a_id : matchB.team_b_id;

  const updateA = sideA === "A" ? { team_a_id: teamInB } : { team_b_id: teamInB };
  const updateB = sideB === "A" ? { team_a_id: teamInA } : { team_b_id: teamInA };

  const { error: updateAError } = await supabase.from("matches").update(updateA).eq("id", matchAId);
  if (updateAError) throw new Error(updateAError.message);
  const { error: updateBError } = await supabase.from("matches").update(updateB).eq("id", matchBId);
  if (updateBError) throw new Error(updateBError.message);

  const warning = await checkEarlySeedCollision(phase.category_id);
  return { warning };
}

/**
 * Intercambia dos equipos entre sus grupos (drag & drop en la fase de
 * grupos) — reasigna también los partidos de round-robin ya generados para
 * que cada equipo herede el calendario del otro grupo, en vez de solo
 * mover teams.group_id y dejar partidos con equipos "fantasma". Regla
 * dura: bloquea si algún partido de cualquiera de los dos grupos ya no
 * está SCHEDULED — mover equipos con partidos ya jugados invalidaría las
 * estadísticas ya calculadas.
 */
export async function swapGroupTeams(teamAId: string, teamBId: string): Promise<void> {
  const supabase = await createClient();
  const { data: teams, error } = await supabase.from("teams").select("id, group_id").in("id", [teamAId, teamBId]);
  if (error) throw new Error(error.message);

  const teamA = teams?.find((t) => t.id === teamAId);
  const teamB = teams?.find((t) => t.id === teamBId);
  if (!teamA?.group_id || !teamB?.group_id) throw new Error("No se encontró alguna de las dos parejas o no tiene grupo asignado.");
  if (teamA.group_id === teamB.group_id) return;

  const { data: groupMatches, error: matchesError } = await supabase
    .from("matches")
    .select("id, status, team_a_id, team_b_id")
    .in("group_id", [teamA.group_id, teamB.group_id]);
  if (matchesError) throw new Error(matchesError.message);
  if ((groupMatches ?? []).some((m) => m.status !== "SCHEDULED")) {
    throw new Error("No se puede mover parejas de un grupo que ya jugó algún partido.");
  }

  for (const m of groupMatches ?? []) {
    let nextTeamA: string | undefined;
    let nextTeamB: string | undefined;
    if (m.team_a_id === teamAId) nextTeamA = teamBId;
    else if (m.team_a_id === teamBId) nextTeamA = teamAId;
    if (m.team_b_id === teamAId) nextTeamB = teamBId;
    else if (m.team_b_id === teamBId) nextTeamB = teamAId;

    if (nextTeamA !== undefined && nextTeamB !== undefined) {
      const { error: patchError } = await supabase.from("matches").update({ team_a_id: nextTeamA, team_b_id: nextTeamB }).eq("id", m.id);
      if (patchError) throw new Error(patchError.message);
    } else if (nextTeamA !== undefined) {
      const { error: patchError } = await supabase.from("matches").update({ team_a_id: nextTeamA }).eq("id", m.id);
      if (patchError) throw new Error(patchError.message);
    } else if (nextTeamB !== undefined) {
      const { error: patchError } = await supabase.from("matches").update({ team_b_id: nextTeamB }).eq("id", m.id);
      if (patchError) throw new Error(patchError.message);
    }
  }

  const { error: err1 } = await supabase.from("teams").update({ group_id: teamB.group_id }).eq("id", teamAId);
  if (err1) throw new Error(err1.message);
  const { error: err2 } = await supabase.from("teams").update({ group_id: teamA.group_id }).eq("id", teamBId);
  if (err2) throw new Error(err2.message);
}
