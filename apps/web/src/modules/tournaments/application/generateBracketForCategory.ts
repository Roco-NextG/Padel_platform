import type { GroupStanding, SeededTeam } from "@padel-platform/tournament-engine";
import { balancedSeeding, calculateStandings, generateBracket, initializeBracketRounds } from "@padel-platform/tournament-engine";
import { buildSeededTeams, phaseTypeForRound } from "../domain/bracket";
import {
  areAllGroupMatchesConfirmed,
  fetchCategoryContext,
  fetchConfirmedGroupMatchResults,
  fetchEnrolledTeams,
  fetchGroupsForCategory,
  fetchTeamsForGroup,
  insertMatches,
  insertPhases,
  type BracketMatchInsert,
} from "../infrastructure/tournamentRepository";

/**
 * Con datos de grupos ya confirmados, el `SeededTeam[]` inicial sale de la
 * clasificación de cada grupo (balancedSeeding) en vez del orden de
 * inscripción — el resto de la función es idéntico para ambos caminos.
 */
async function seededTeamsFromGroups(categoryId: string): Promise<SeededTeam[]> {
  const groups = await fetchGroupsForCategory(categoryId);
  if (groups.length === 0) {
    throw new Error("Esta categoría todavía no tiene grupos formados.");
  }

  const standingsByGroup: Record<string, GroupStanding[]> = {};
  for (const group of groups) {
    const teamIds = await fetchTeamsForGroup(group.id);
    const results = await fetchConfirmedGroupMatchResults(group.id);
    standingsByGroup[group.id] = calculateStandings(teamIds, results);
  }

  return balancedSeeding(standingsByGroup);
}

/**
 * Generación inicial del cuadro (docs/04_TOURNAMENT_ENGINE.md §8). El
 * `SeededTeam[]` inicial sale de dos lugares posibles según
 * `uses_group_stage`: orden de inscripción (bracket directo) o clasificación
 * de grupo ya jugada (balancedSeeding) — a partir de ahí todo el resto es
 * idéntico, delegado por completo en @padel-platform/tournament-engine
 * (generateBracket + initializeBracketRounds, nunca reimplementado acá), y
 * persiste:
 *   - una fila tournament_phases por ronda,
 *   - una fila matches por partido de ronda 1 (los resueltos por bye, ya CONFIRMED
 *     con winner_team_id),
 *   - y cualquier partido de ronda 2+ que initializeBracketRounds ya haya dejado
 *     listo únicamente por byes encadenados (ej. dos byes que se cruzan entre sí).
 *
 * Todo esto ocurre dentro de una sola llamada de organizador: como el
 * `BracketResult` completo ya vive en memoria, no hay condición de carrera
 * posible entre estas escrituras (a diferencia del avance tras confirmar un
 * partido, que sí puede correr en paralelo — ver advanceOrFinishBracket).
 */
export async function generateBracketForCategory(categoryId: string): Promise<{
  tournamentId: string;
  totalRounds: number;
  unresolvedGroupConflicts: number;
}> {
  const category = await fetchCategoryContext(categoryId);
  if (!category) throw new Error(`Categoría ${categoryId} no encontrada.`);
  const { tournamentId, usesGroupStage } = category;

  let seededTeams: SeededTeam[];
  if (usesGroupStage) {
    const allConfirmed = await areAllGroupMatchesConfirmed(categoryId);
    if (!allConfirmed) {
      throw new Error("Todavía hay partidos de grupo sin confirmar — no se puede generar el cuadro.");
    }
    seededTeams = await seededTeamsFromGroups(categoryId);
  } else {
    const enrolledTeams = await fetchEnrolledTeams(categoryId);
    if (enrolledTeams.length < 2) {
      throw new Error("Se necesitan al menos 2 equipos inscritos para generar el cuadro.");
    }
    seededTeams = buildSeededTeams(enrolledTeams);
  }

  const bracket = generateBracket(seededTeams);
  const rounds = initializeBracketRounds(bracket);
  const totalRounds = rounds.length;

  const phaseRows = await insertPhases(
    categoryId,
    rounds.map((r) => ({ type: phaseTypeForRound(r.roundNumber, totalRounds), orderIndex: r.roundNumber }))
  );
  const phaseIdByRound = new Map(phaseRows.map((p) => [p.order_index, p.id]));

  const round1PhaseId = phaseIdByRound.get(1);
  if (!round1PhaseId) throw new Error("No se pudo crear la fase de ronda 1.");

  const matchRows: BracketMatchInsert[] = rounds[0].matches.map((m) => ({
    tournamentId,
    phaseId: round1PhaseId,
    roundIndex: m.matchIndex,
    teamAId: m.teamAId,
    teamBId: m.teamBId,
    status: m.isByeMatch ? "CONFIRMED" : "SCHEDULED",
    winnerTeamId: m.isByeMatch ? m.autoAdvanceTeamId : null,
    matchType: "TOURNAMENT",
  }));

  // Rondas 2+ que initializeBracketRounds ya dejó listas solo por byes
  // encadenados (docs/04 §8: nunca se persiste un Match con un solo lado resuelto).
  for (let i = 1; i < rounds.length; i++) {
    const round = rounds[i];
    const phaseId = phaseIdByRound.get(round.roundNumber);
    if (!phaseId) throw new Error(`No se pudo crear la fase de ronda ${round.roundNumber}.`);
    for (const m of round.matches) {
      if (m.teamAId && m.teamBId) {
        matchRows.push({
          tournamentId,
          phaseId,
          roundIndex: m.matchIndex,
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          status: "SCHEDULED",
          winnerTeamId: null,
          matchType: "TOURNAMENT",
        });
      }
    }
  }

  await insertMatches(matchRows);

  return {
    tournamentId,
    totalRounds,
    unresolvedGroupConflicts: bracket.unresolvedGroupConflicts.length,
  };
}
