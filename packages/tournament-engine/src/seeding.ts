import { GroupId, GroupStanding, SeededTeam } from "./types";

/**
 * Seeding balanceado (04_TOURNAMENT_ENGINE.md §4).
 *
 * No ordena simplemente A1, B1, C1, D1, A2, B2... por posición de grupo.
 * Primero agrupa por posición final en el grupo (todos los 1º juntos, todos
 * los 2º juntos, ...) y dentro de cada posición, desempata por fortaleza
 * relativa (partidos ganados, diferencia de sets/games) usando el mismo
 * criterio que la clasificación de grupo — así un 1º de un grupo muy fuerte
 * puede quedar mejor sembrado que un 1º de un grupo débil.
 */
export function balancedSeeding(
  standingsByGroup: Record<GroupId, GroupStanding[]>
): SeededTeam[] {
  const groupIds = Object.keys(standingsByGroup);
  const maxPosition = Math.max(
    ...groupIds.map((g) => standingsByGroup[g].length)
  );

  const seeded: SeededTeam[] = [];

  for (let position = 0; position < maxPosition; position++) {
    const finishersAtThisPosition = groupIds
      .filter((g) => standingsByGroup[g][position] !== undefined)
      .map((g) => ({ groupId: g, standing: standingsByGroup[g][position] }));

    // dentro de la misma posición de grupo, ordenar por fortaleza relativa
    finishersAtThisPosition.sort((x, y) => {
      const a = x.standing;
      const b = y.standing;
      if (a.matchesWon !== b.matchesWon) return b.matchesWon - a.matchesWon;
      if (a.gamesWon !== b.gamesWon) return b.gamesWon - a.gamesWon;
      if (a.setDiff !== b.setDiff) return b.setDiff - a.setDiff;
      return b.gameDiff - a.gameDiff;
    });

    for (const f of finishersAtThisPosition) {
      seeded.push({
        teamId: f.standing.teamId,
        groupId: f.groupId,
        seed: 0, // se asigna abajo, tras tener el orden completo
      });
    }
  }

  seeded.forEach((s, i) => (s.seed = i + 1));
  return seeded;
}
