import { describe, it, expect } from "vitest";
import { calculateStandings, compareStandings, pairKey } from "../src/standings";
import { GroupStanding, MatchResult } from "../src/types";

function baseStanding(teamId: string, overrides: Partial<GroupStanding> = {}): GroupStanding {
  return {
    teamId,
    matchesPlayed: 0,
    matchesWon: 0,
    gamesWon: 0,
    gamesLost: 0,
    setsWon: 0,
    setsLost: 0,
    setDiff: 0,
    gameDiff: 0,
    requiresManualResolution: false,
    ...overrides,
  };
}

describe("calculateStandings — orden de desempate confirmado", () => {
  it("ordena primero por partidos ganados", () => {
    const results: MatchResult[] = [
      { teamAId: "A", teamBId: "B", winnerId: "A", setsWonA: 2, setsWonB: 0, gamesWonA: 12, gamesWonB: 4 },
      { teamAId: "A", teamBId: "C", winnerId: "A", setsWonA: 2, setsWonB: 0, gamesWonA: 12, gamesWonB: 4 },
      { teamAId: "B", teamBId: "C", winnerId: "B", setsWonA: 2, setsWonB: 0, gamesWonA: 12, gamesWonB: 4 },
    ];
    const standings = calculateStandings(["A", "B", "C"], results);
    expect(standings[0].teamId).toBe("A"); // 2 victorias
    expect(standings[1].teamId).toBe("B"); // 1 victoria
    expect(standings[2].teamId).toBe("C"); // 0 victorias
  });

  it("desempata por juegos ganados cuando hay igualdad de partidos ganados", () => {
    // A y B no se enfrentan entre sí; ambos le ganan a C una sola vez,
    // con el mismo número de partidos ganados pero distinto total de games.
    const results: MatchResult[] = [
      { teamAId: "A", teamBId: "C", winnerId: "A", setsWonA: 2, setsWonB: 0, gamesWonA: 12, gamesWonB: 4 },
      { teamAId: "B", teamBId: "C", winnerId: "B", setsWonA: 2, setsWonB: 0, gamesWonA: 15, gamesWonB: 5 },
    ];
    const standings = calculateStandings(["A", "B", "C"], results);
    const a = standings.find((s) => s.teamId === "A")!;
    const b = standings.find((s) => s.teamId === "B")!;
    expect(a.matchesWon).toBe(b.matchesWon); // 1 victoria cada uno
    expect(b.gamesWon).toBeGreaterThan(a.gamesWon); // B ganó más juegos (15 vs 12)
    expect(standings[0].teamId).toBe("B");
  });

  it("usa enfrentamiento directo como último criterio, probado de forma aislada sobre el comparador", () => {
    // Dos standings idénticos en matchesWon, gamesWon, setDiff y gameDiff:
    // el único desempate posible es el resultado directo entre ellos.
    const a = baseStanding("A", { matchesWon: 2, gamesWon: 20, setDiff: 3, gameDiff: 10 });
    const b = baseStanding("B", { matchesWon: 2, gamesWon: 20, setDiff: 3, gameDiff: 10 });

    const h2hMatch: MatchResult = {
      teamAId: "A",
      teamBId: "B",
      winnerId: "A",
      setsWonA: 2,
      setsWonB: 1,
      gamesWonA: 13,
      gamesWonB: 11,
    };
    const headToHead = new Map<string, MatchResult>([[pairKey("A", "B"), h2hMatch]]);

    expect(compareStandings(a, b, headToHead)).toBeLessThan(0); // A queda por delante
    expect(compareStandings(b, a, headToHead)).toBeGreaterThan(0); // simétrico
  });

  it("marca requiresManualResolution cuando el empate persiste tras los 4 criterios", () => {
    // 3 equipos en un ciclo perfecto (A>B, B>C, C>A) con stats idénticas: imposible desempatar
    const results: MatchResult[] = [
      { teamAId: "A", teamBId: "B", winnerId: "A", setsWonA: 2, setsWonB: 1, gamesWonA: 12, gamesWonB: 10 },
      { teamAId: "B", teamBId: "C", winnerId: "B", setsWonA: 2, setsWonB: 1, gamesWonA: 12, gamesWonB: 10 },
      { teamAId: "C", teamBId: "A", winnerId: "C", setsWonA: 2, setsWonB: 1, gamesWonA: 12, gamesWonB: 10 },
    ];
    const standings = calculateStandings(["A", "B", "C"], results);
    expect(standings.every((s) => s.requiresManualResolution)).toBe(true);
  });
});
