import { distributeIntoGroups, generateGroupMatches } from "@padel-platform/tournament-engine";
import {
  fetchCategoryContext,
  fetchEnrolledTeams,
  insertGroupMatches,
  insertGroups,
  insertPhases,
  updateTeamGroups,
  type GroupMatchInsert,
} from "../infrastructure/tournamentRepository";

/**
 * Formación de grupos (docs/04_TOURNAMENT_ENGINE.md §2), disparada a mano
 * por el organizador al cerrar inscripciones de una categoría con
 * `uses_group_stage`. Reparto serpentina y round-robin son 100% de
 * @padel-platform/tournament-engine (distributeIntoGroups/generateGroupMatches,
 * nunca reimplementados acá) — esta función solo persiste:
 *   - una fila tournament_groups por grupo,
 *   - teams.group_id actualizado para cada equipo,
 *   - una única fila tournament_phases (type GROUPS, order_index 0) compartida
 *     por todos los grupos de la categoría,
 *   - una fila matches por cruce de cada grupo (generateGroupMatches), SCHEDULED,
 *     sin bracket todavía — se confirman por el mismo camino que cualquier otro
 *     Match (submit_match_result / confirmación de jugadores, 0007), no hace
 *     falta nada nuevo ahí.
 */
export async function generateGroupsForCategory(
  categoryId: string,
  groupSize: number
): Promise<{ groupCount: number }> {
  const category = await fetchCategoryContext(categoryId);
  if (!category) throw new Error(`Categoría ${categoryId} no encontrada.`);
  if (!category.usesGroupStage) {
    throw new Error("Esta categoría no usa fase de grupos.");
  }

  const enrolledTeams = await fetchEnrolledTeams(categoryId);
  if (enrolledTeams.length < 3) {
    throw new Error("Se necesitan al menos 3 equipos inscritos para formar grupos.");
  }

  const groupsByName = distributeIntoGroups(
    enrolledTeams.map((t) => ({ id: t.teamId, initialSeed: t.organizerSeed })),
    groupSize
  );
  const groupNames = Object.keys(groupsByName);

  const groupRows = await insertGroups(categoryId, groupNames);
  const groupIdByName = new Map(groupRows.map((g) => [g.name, g.id]));

  const teamAssignments = groupNames.flatMap((name) => {
    const groupId = groupIdByName.get(name);
    if (!groupId) throw new Error(`No se pudo crear el grupo ${name}.`);
    return groupsByName[name].map((teamId) => ({ teamId, groupId }));
  });
  await updateTeamGroups(teamAssignments);

  const [groupsPhase] = await insertPhases(categoryId, [{ type: "GROUPS", orderIndex: 0 }]);
  if (!groupsPhase) throw new Error("No se pudo crear la fase de grupos.");

  const matchRows: GroupMatchInsert[] = groupNames.flatMap((name) => {
    const groupId = groupIdByName.get(name)!;
    return generateGroupMatches(groupsByName[name]).map(([teamAId, teamBId]) => ({
      tournamentId: category.tournamentId,
      phaseId: groupsPhase.id,
      groupId,
      teamAId,
      teamBId,
      matchType: "TOURNAMENT" as const,
    }));
  });
  await insertGroupMatches(matchRows);

  return { groupCount: groupNames.length };
}
