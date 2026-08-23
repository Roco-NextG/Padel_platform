import { Team, TeamId, GroupId } from "./types";

/**
 * Genera todos los enfrentamientos de round-robin ("todos contra todos")
 * para un grupo de tamaño g. Produce g*(g-1)/2 partidos.
 */
export function generateGroupMatches(teamIds: TeamId[]): [TeamId, TeamId][] {
  const matches: [TeamId, TeamId][] = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matches.push([teamIds[i], teamIds[j]]);
    }
  }
  return matches;
}

/**
 * Distribuye equipos en grupos usando reparto serpentina por seed inicial
 * (04_TOURNAMENT_ENGINE.md §2). Si un equipo no tiene seed, se le asigna
 * un orden aleatorio controlado por `randomSeed` (determinista, reproducible).
 */
export function distributeIntoGroups(
  teams: (Team & { initialSeed?: number | null })[],
  groupSize = 4,
  randomSeed = 42
): Record<GroupId, TeamId[]> {
  const ordered = [...teams].sort((a, b) => {
    const seedA = a.initialSeed ?? Infinity;
    const seedB = b.initialSeed ?? Infinity;
    if (seedA !== seedB) return seedA - seedB;
    // desempate determinista para equipos sin seed, basado en un PRNG simple con randomSeed
    return deterministicOrder(a.id, randomSeed) - deterministicOrder(b.id, randomSeed);
  });

  const numGroups = Math.ceil(ordered.length / groupSize);
  const groupNames = Array.from({ length: numGroups }, (_, i) => letterGroupName(i));
  const groups: Record<GroupId, TeamId[]> = {};
  for (const name of groupNames) groups[name] = [];

  // reparto serpentina: 1,2,3,4,4,3,2,1,1,2,3,4,...
  let groupIndex = 0;
  let direction = 1;
  for (const team of ordered) {
    groups[groupNames[groupIndex]].push(team.id);
    groupIndex += direction;
    if (groupIndex === numGroups) {
      groupIndex = numGroups - 1;
      direction = -1;
    } else if (groupIndex === -1) {
      groupIndex = 0;
      direction = 1;
    }
  }

  return groups;
}

function letterGroupName(index: number): string {
  // A, B, C, ..., Z, AA, AB, ...
  let n = index;
  let name = "";
  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `Grupo ${name}`;
}

/** PRNG simple y determinista (no criptográfico) solo para desempatar orden reproducible. */
function deterministicOrder(id: string, seed: number): number {
  let hash = seed;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash;
}
