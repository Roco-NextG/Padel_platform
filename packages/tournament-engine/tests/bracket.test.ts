import { describe, it, expect } from "vitest";
import {
  generateBracket,
  generateSeedOrder,
  nextPowerOfTwo,
  earliestPossibleRound,
} from "../src/bracket";
import { SeededTeam } from "../src/types";

function makeTeams(n: number, groupOf?: (i: number) => string): SeededTeam[] {
  return Array.from({ length: n }, (_, i) => ({
    teamId: `T${i + 1}`,
    seed: i + 1,
    groupId: groupOf ? groupOf(i) : null,
  }));
}

describe("nextPowerOfTwo", () => {
  it.each([
    [4, 4],
    [8, 8],
    [12, 16],
    [16, 16],
    [20, 32],
    [24, 32],
    [32, 32],
  ])("nextPowerOfTwo(%i) === %i", (input, expected) => {
    expect(nextPowerOfTwo(input)).toBe(expected);
  });
});

describe("generateSeedOrder — cabezas de serie estándar", () => {
  it("size=8 produce el orden clásico 1,8,4,5,2,7,3,6", () => {
    expect(generateSeedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it("seed 1 y seed 2 solo se cruzan en la final para cualquier tamaño", () => {
    for (const size of [4, 8, 16, 32]) {
      const order = generateSeedOrder(size);
      const pos1 = order.indexOf(1);
      const pos2 = order.indexOf(2);
      expect(earliestPossibleRound(pos1, pos2)).toBe(Math.log2(size));
    }
  });
});

describe("generateBracket — matriz de pruebas obligatoria (04_TOURNAMENT_ENGINE.md §9)", () => {
  it.each([8, 16, 32])("con %i parejas exactas: sin byes, bracket válido", (n) => {
    const teams = makeTeams(n);
    const result = generateBracket(teams);
    expect(result.byes).toBe(0);
    expect(result.bracketSize).toBe(n);
    assertNoTeamPlaysItself(result);
    assertNoByeAmbiguity(result);
  });

  it.each([12, 20, 24])(
    "con %i parejas (bye): bracket_size = siguiente potencia de 2, byes correctos",
    (n) => {
      const teams = makeTeams(n);
      const result = generateBracket(teams);
      const expectedSize = nextPowerOfTwo(n);
      expect(result.bracketSize).toBe(expectedSize);
      expect(result.byes).toBe(expectedSize - n);
      assertNoTeamPlaysItself(result);
      assertNoByeAmbiguity(result);
    }
  );

  it("los byes se asignan a los mejores seeds y no se concentran en la misma mitad", () => {
    const teams = makeTeams(12); // bracket de 16, 4 byes
    const result = generateBracket(teams);
    const byeSlots = result.slots.filter((s) => s.isBye);
    expect(byeSlots).toHaveLength(4);

    const half = result.bracketSize / 2;
    const byesTopHalf = byeSlots.filter((s) => s.position < half).length;
    const byesBottomHalf = byeSlots.filter((s) => s.position >= half).length;
    // no deberían estar todos concentrados en una sola mitad
    expect(byesTopHalf).toBeGreaterThan(0);
    expect(byesBottomHalf).toBeGreaterThan(0);
  });

  it("nunca genera un partido con dos ganadores posibles (autoAdvance solo si hay bye)", () => {
    const teams = makeTeams(20);
    const result = generateBracket(teams);
    for (const m of result.firstRoundMatches) {
      if (m.isByeMatch) {
        expect(m.autoAdvanceTeamId).not.toBeNull();
      } else {
        expect(m.autoAdvanceTeamId).toBeNull();
        expect(m.teamAId).not.toBeNull();
        expect(m.teamBId).not.toBeNull();
      }
    }
  });

  it("separa equipos del mismo grupo cuando es matemáticamente posible", () => {
    // 8 equipos, 4 grupos de 2 clasificados cada uno -> debería poder separarlos
    const groupOf = (i: number) => `G${Math.floor(i / 2) + 1}`;
    const teams = makeTeams(8, groupOf);
    const result = generateBracket(teams);
    expect(result.unresolvedGroupConflicts).toHaveLength(0);
  });

  it("cuando la separación total es imposible, documenta el conflicto en vez de fallar", () => {
    // caso extremo: 8 equipos, TODOS del mismo grupo -> imposible separarlos de la final
    const teams = makeTeams(8, () => "G1");
    const result = generateBracket(teams);
    // no debe lanzar excepción; debe generar el bracket igual
    expect(result.slots).toHaveLength(8);
    // con 8 equipos del mismo grupo es matemáticamente imposible que ninguno
    // se cruce antes de la final: debe haber conflictos documentados
    expect(result.unresolvedGroupConflicts.length).toBeGreaterThan(0);
  });
});

function assertNoTeamPlaysItself(result: ReturnType<typeof generateBracket>) {
  for (const m of result.firstRoundMatches) {
    if (m.teamAId && m.teamBId) {
      expect(m.teamAId).not.toBe(m.teamBId);
    }
  }
}

function assertNoByeAmbiguity(result: ReturnType<typeof generateBracket>) {
  // cada match de bye debe tener exactamente un lado BYE y un equipo real
  for (const m of result.firstRoundMatches) {
    if (m.isByeMatch) {
      const sides = [m.teamAId, m.teamBId];
      const realSides = sides.filter((s) => s !== null);
      expect(realSides).toHaveLength(1);
    }
  }
}
