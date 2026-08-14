import { GroupStanding, MatchResult, TeamId } from "./types";

/**
 * Calcula la clasificación de un grupo.
 *
 * Orden de desempate confirmado (04_TOURNAMENT_ENGINE.md §3):
 *   0. Partidos ganados (criterio de agrupación primario)
 *   1. Juegos ganados (total)
 *   2. Diferencia de sets
 *   3. Diferencia de games
 *   4. Enfrentamiento directo (solo resuelve empates de exactamente 2 equipos)
 *
 * Si tras estos 5 pasos sigue habiendo empate (3+ equipos, o head-to-head
 * también empatado), esos equipos quedan marcados con
 * `requiresManualResolution = true` y el orden entre ellos no se garantiza
 * — el organizador resuelve manualmente (sección 3 del spec).
 */
export function calculateStandings(
  teamIds: TeamId[],
  results: MatchResult[]
): GroupStanding[] {
  const table = new Map<TeamId, GroupStanding>();
  for (const id of teamIds) {
    table.set(id, {
      teamId: id,
      matchesPlayed: 0,
      matchesWon: 0,
      gamesWon: 0,
      gamesLost: 0,
      setsWon: 0,
      setsLost: 0,
      setDiff: 0,
      gameDiff: 0,
      requiresManualResolution: false,
    });
  }

  for (const r of results) {
    const a = table.get(r.teamAId);
    const b = table.get(r.teamBId);
    if (!a || !b) continue; // resultado de un equipo fuera de este grupo: se ignora

    a.matchesPlayed++;
    b.matchesPlayed++;
    a.gamesWon += r.gamesWonA;
    a.gamesLost += r.gamesWonB;
    b.gamesWon += r.gamesWonB;
    b.gamesLost += r.gamesWonA;
    a.setsWon += r.setsWonA;
    a.setsLost += r.setsWonB;
    b.setsWon += r.setsWonB;
    b.setsLost += r.setsWonA;

    if (r.winnerId === r.teamAId) a.matchesWon++;
    else if (r.winnerId === r.teamBId) b.matchesWon++;
  }

  for (const s of table.values()) {
    s.setDiff = s.setsWon - s.setsLost;
    s.gameDiff = s.gamesWon - s.gamesLost;
  }

  const headToHead = buildHeadToHeadIndex(results);

  const standings = Array.from(table.values());
  standings.sort((x, y) => compareStandings(x, y, headToHead));

  flagUnresolvedTies(standings);

  return standings;
}

/**
 * Comparador puro del orden de desempate confirmado. Se expone por separado
 * para poder testear el ORDEN de los criterios de forma aislada, sin
 * depender de reconstruir resultados de partido que produzcan cada empate.
 */
export function compareStandings(
  x: GroupStanding,
  y: GroupStanding,
  headToHead: Map<string, MatchResult>
): number {
  if (x.matchesWon !== y.matchesWon) return y.matchesWon - x.matchesWon;
  if (x.gamesWon !== y.gamesWon) return y.gamesWon - x.gamesWon;
  if (x.setDiff !== y.setDiff) return y.setDiff - x.setDiff;
  if (x.gameDiff !== y.gameDiff) return y.gameDiff - x.gameDiff;
  const h2h = headToHead.get(pairKey(x.teamId, y.teamId));
  if (h2h) return h2h.winnerId === x.teamId ? -1 : 1;
  return 0; // empate exacto: orden no garantizado, se marca abajo
}

function buildHeadToHeadIndex(results: MatchResult[]): Map<string, MatchResult> {
  const index = new Map<string, MatchResult>();
  for (const r of results) {
    index.set(pairKey(r.teamAId, r.teamBId), r);
  }
  return index;
}

export function pairKey(a: TeamId, b: TeamId): string {
  return [a, b].sort().join("::");
}

function flagUnresolvedTies(sorted: GroupStanding[]): void {
  for (let i = 0; i < sorted.length; i++) {
    const group = sorted.filter(
      (s) =>
        s.matchesWon === sorted[i].matchesWon &&
        s.gamesWon === sorted[i].gamesWon &&
        s.setDiff === sorted[i].setDiff &&
        s.gameDiff === sorted[i].gameDiff
    );
    if (group.length > 1) {
      for (const g of group) g.requiresManualResolution = true;
    }
  }
}
