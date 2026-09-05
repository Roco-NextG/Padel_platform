import { describe, it, expect } from "vitest";
import { balancedSeeding } from "../src/seeding";
import { GroupStanding } from "../src/types";

function standing(teamId: string, overrides: Partial<GroupStanding> = {}): GroupStanding {
  return {
    teamId,
    matchesPlayed: 3,
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

describe("balancedSeeding — lista global de fortaleza (04_TOURNAMENT_ENGINE.md §4.1/§4.2)", () => {
  it("NO agrupa por posición de grupo: un 2º con mejor récord queda sembrado por encima de un 1º con peor récord", () => {
    const standingsByGroup = {
      A: [
        standing("A1", { matchesWon: 2, gamesWon: 20, setDiff: 1 }), // 1º de A, récord flojo
        standing("A2", { matchesWon: 0 }),
      ],
      B: [
        standing("B1", { matchesWon: 3, gamesWon: 25, setDiff: 8 }),
        // 2º de B, mismos partidos ganados que A1 pero mejor diferencia de sets
        standing("B2", { matchesWon: 2, gamesWon: 20, setDiff: 5 }),
      ],
    };

    const seeded = balancedSeeding(standingsByGroup);
    const seedOf = (teamId: string) => seeded.find((s) => s.teamId === teamId)!.seed;

    // B2 (2º de grupo) tiene mejor récord global que A1 (1º de grupo) — debe
    // quedar mejor sembrado (seed más bajo), no detrás por haber sido 2º.
    expect(seedOf("B2")).toBeLessThan(seedOf("A1"));
  });

  it("ordena por partidos ganados → juegos ganados → diferencia de sets → diferencia de games", () => {
    const standingsByGroup = {
      A: [
        standing("empatePartidos_masJuegos", { matchesWon: 2, gamesWon: 30 }),
        standing("empatePartidos_menosJuegos", { matchesWon: 2, gamesWon: 20 }),
      ],
      B: [
        standing("masPartidos", { matchesWon: 3, gamesWon: 10 }),
        standing("menosPartidos", { matchesWon: 1, gamesWon: 40 }),
      ],
    };

    const seeded = balancedSeeding(standingsByGroup);
    const order = seeded.sort((a, b) => a.seed - b.seed).map((s) => s.teamId);

    expect(order).toEqual([
      "masPartidos", // más partidos ganados manda por encima de todo
      "empatePartidos_masJuegos", // empate en partidos -> desempata juegos ganados
      "empatePartidos_menosJuegos",
      "menosPartidos",
    ]);
  });

  it("el enfrentamiento directo no se usa entre grupos distintos (no existe el dato) y no rompe el orden", () => {
    // Dos equipos de grupos distintos, mismo récord exacto en los 4 criterios
    // aplicables — no hay forma de desempatar entre ellos (nunca jugaron),
    // así que deben quedar marcados para resolución manual del organizador.
    const standingsByGroup = {
      A: [standing("A1", { matchesWon: 3, gamesWon: 20, setDiff: 4, gameDiff: 10 })],
      B: [standing("B1", { matchesWon: 3, gamesWon: 20, setDiff: 4, gameDiff: 10 })],
    };

    const seeded = balancedSeeding(standingsByGroup);
    expect(seeded.find((s) => s.teamId === "A1")!.requiresManualResolution).toBe(true);
    expect(seeded.find((s) => s.teamId === "B1")!.requiresManualResolution).toBe(true);
  });

  it("equipos sin empate no quedan marcados para resolución manual", () => {
    const standingsByGroup = {
      A: [standing("A1", { matchesWon: 3 }), standing("A2", { matchesWon: 1 })],
    };
    const seeded = balancedSeeding(standingsByGroup);
    expect(seeded.every((s) => !s.requiresManualResolution)).toBe(true);
  });

  it("asigna seeds correlativos 1..N sobre la lista completa, conservando el group_id de origen", () => {
    const standingsByGroup = {
      A: [standing("A1", { matchesWon: 3 }), standing("A2", { matchesWon: 0 })],
      B: [standing("B1", { matchesWon: 2 }), standing("B2", { matchesWon: 1 })],
    };
    const seeded = balancedSeeding(standingsByGroup);
    expect(seeded.map((s) => s.seed).sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
    expect(seeded.find((s) => s.teamId === "A1")!.groupId).toBe("A");
    expect(seeded.find((s) => s.teamId === "B2")!.groupId).toBe("B");
  });
});
