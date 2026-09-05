import { GroupId, GroupStanding, SeededTeam } from "./types";

/**
 * Lista global de fortaleza + seeding balanceado (04_TOURNAMENT_ENGINE.md §4.1/§4.2).
 *
 * Corrección confirmada por el fundador sobre la versión anterior: el
 * seeding NO agrupa primero por posición final de grupo (todos los 1º
 * juntos, después todos los 2º...) — eso haría que un 1º de un grupo débil
 * quede siempre mejor sembrado que un 2º de un grupo fuerte, aunque este
 * último tenga mejor récord real. En vez de eso, TODOS los clasificados de
 * TODOS los grupos entran a una única lista ordenada, sin importar en qué
 * posición de grupo terminaron:
 *
 *   1. Partidos ganados (en su fase de grupos)
 *   2. Juegos ganados (total)
 *   3. Diferencia de sets
 *   4. Diferencia de games
 *
 * El enfrentamiento directo (criterio 5 de la clasificación de grupo, §3)
 * NO aplica acá — parejas de grupos distintos nunca jugaron entre sí. Si el
 * empate persiste tras los 4 criterios de arriba, el orden entre esos
 * equipos no está garantizado y quedan marcados con
 * `requiresManualResolution = true` — el organizador resuelve manualmente
 * (mismo criterio que la clasificación de grupo).
 *
 * Supuesto asumido a pedido del fundador (§4.1, nota): esta comparación
 * NO normaliza "partidos ganados" por tamaño de grupo — si dos grupos
 * tienen cantidades distintas de partidos jugados, se comparan igual como
 * si todos los grupos fueran del mismo tamaño. Pendiente de revisar si en
 * el futuro se permiten grupos de tamaño mixto con normalización real.
 */
export function balancedSeeding(
  standingsByGroup: Record<GroupId, GroupStanding[]>
): SeededTeam[] {
  const entries: { groupId: GroupId; standing: GroupStanding }[] = [];
  for (const groupId of Object.keys(standingsByGroup)) {
    for (const standing of standingsByGroup[groupId]) {
      entries.push({ groupId, standing });
    }
  }

  entries.sort((x, y) => compareGlobalStrength(x.standing, y.standing));

  const tieFlags = flagUnresolvedGlobalTies(entries.map((e) => e.standing));

  return entries.map((entry, i) => ({
    teamId: entry.standing.teamId,
    groupId: entry.groupId,
    seed: i + 1,
    requiresManualResolution: tieFlags[i],
  }));
}

/**
 * Comparador puro de la lista global (§4.1) — igual a los primeros 4
 * criterios de `compareStandings` (standings.ts), pero sin enfrentamiento
 * directo, que no tiene sentido entre equipos que nunca se enfrentaron.
 */
function compareGlobalStrength(a: GroupStanding, b: GroupStanding): number {
  if (a.matchesWon !== b.matchesWon) return b.matchesWon - a.matchesWon;
  if (a.gamesWon !== b.gamesWon) return b.gamesWon - a.gamesWon;
  if (a.setDiff !== b.setDiff) return b.setDiff - a.setDiff;
  return b.gameDiff - a.gameDiff;
}

function flagUnresolvedGlobalTies(sorted: GroupStanding[]): boolean[] {
  return sorted.map((s) => {
    const tied = sorted.filter(
      (o) =>
        o.matchesWon === s.matchesWon &&
        o.gamesWon === s.gamesWon &&
        o.setDiff === s.setDiff &&
        o.gameDiff === s.gameDiff
    );
    return tied.length > 1;
  });
}
