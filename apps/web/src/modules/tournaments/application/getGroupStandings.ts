import type { GroupStanding } from "@padel-platform/tournament-engine";
import { calculateStandings } from "@padel-platform/tournament-engine";
import {
  fetchConfirmedGroupMatchResults,
  fetchGroupsForCategory,
  fetchTeamNames,
  fetchTeamsForGroup,
} from "../infrastructure/tournamentRepository";

export interface GroupStandingRow extends GroupStanding {
  teamName: string;
}

export interface GroupStandingsView {
  groupId: string;
  groupName: string;
  standings: GroupStandingRow[];
}

/**
 * Sin tabla nueva — se recalcula al vuelo en cada carga (docs/04
 * §3): barato para el tamaño real de un grupo, y evita que la clasificación
 * persistida pueda desincronizarse de los Match confirmados que la producen.
 */
export async function getGroupStandingsForCategory(categoryId: string): Promise<GroupStandingsView[]> {
  const groups = await fetchGroupsForCategory(categoryId);
  if (groups.length === 0) return [];

  return Promise.all(
    groups.map(async (group) => {
      const teamIds = await fetchTeamsForGroup(group.id);
      const results = await fetchConfirmedGroupMatchResults(group.id);
      const standings = calculateStandings(teamIds, results);
      const teamNames = await fetchTeamNames(teamIds);
      return {
        groupId: group.id,
        groupName: group.name,
        standings: standings.map((s) => ({ ...s, teamName: teamNames.get(s.teamId) ?? "Equipo" })),
      };
    })
  );
}
