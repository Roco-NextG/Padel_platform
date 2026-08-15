import { describe, it, expect } from "vitest";
import { validateMatchResult } from "../src/matchValidation";
import { DEFAULT_SCORING_CONFIG, ScoringConfig } from "../src/types";

const regularBestOf3: ScoringConfig = { ...DEFAULT_SCORING_CONFIG, finalSetMode: "REGULAR" };

describe("validateMatchResult — resultado válido", () => {
  it("acepta un 2-0 en sets (6-4, 6-3)", () => {
    const r = validateMatchResult(
      [
        { setNumber: 1, teamAGames: 6, teamBGames: 4 },
        { setNumber: 2, teamAGames: 6, teamBGames: 3 },
      ],
      regularBestOf3,
      "A"
    );
    expect(r.valid).toBe(true);
    expect(r.winner).toBe("A");
  });

  it("acepta un 2-1 con super tiebreak decisivo", () => {
    const r = validateMatchResult(
      [
        { setNumber: 1, teamAGames: 6, teamBGames: 4 },
        { setNumber: 2, teamAGames: 3, teamBGames: 6 },
        { setNumber: 3, teamAGames: 1, teamBGames: 0, tiebreakA: 10, tiebreakB: 7 },
      ],
      DEFAULT_SCORING_CONFIG, // finalSetMode: SUPER_TIEBREAK por defecto
      "A"
    );
    expect(r.valid).toBe(true);
    expect(r.winner).toBe("A");
  });
});

describe("validateMatchResult — ganador inconsistente con los sets: rechazado", () => {
  it("rechaza si se declara ganador B pero los sets dicen A", () => {
    const r = validateMatchResult(
      [
        { setNumber: 1, teamAGames: 6, teamBGames: 4 },
        { setNumber: 2, teamAGames: 6, teamBGames: 3 },
      ],
      regularBestOf3,
      "B"
    );
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/no es consistente/);
  });

  it("rechaza si ningún equipo llegó a los sets necesarios (1-1 sin tercer set)", () => {
    const r = validateMatchResult(
      [
        { setNumber: 1, teamAGames: 6, teamBGames: 4 },
        { setNumber: 2, teamAGames: 3, teamBGames: 6 },
      ],
      regularBestOf3,
      "A"
    );
    expect(r.valid).toBe(false);
  });

  it("rechaza sets extra después de que el partido ya estaba decidido", () => {
    const r = validateMatchResult(
      [
        { setNumber: 1, teamAGames: 6, teamBGames: 4 },
        { setNumber: 2, teamAGames: 6, teamBGames: 3 },
        { setNumber: 3, teamAGames: 6, teamBGames: 1 }, // sobra, ya habia ganado en el set 2
      ],
      regularBestOf3,
      "A"
    );
    expect(r.valid).toBe(false);
  });
});

describe("validateMatchResult — sin al menos un SetScore válido por set: rechazado", () => {
  it("rechaza una lista vacía de sets", () => {
    const r = validateMatchResult([], regularBestOf3, "A");
    expect(r.valid).toBe(false);
  });

  it("rechaza si falta un número de set (1, 3 pero no 2)", () => {
    const r = validateMatchResult(
      [
        { setNumber: 1, teamAGames: 6, teamBGames: 4 },
        { setNumber: 3, teamAGames: 6, teamBGames: 3 },
      ],
      regularBestOf3,
      "A"
    );
    expect(r.valid).toBe(false);
  });

  it("rechaza el partido completo si un solo set es inválido, con el motivo específico", () => {
    const r = validateMatchResult(
      [
        { setNumber: 1, teamAGames: 6, teamBGames: 6 }, // invalido: empate sin tiebreak
        { setNumber: 2, teamAGames: 6, teamBGames: 3 },
      ],
      regularBestOf3,
      "A"
    );
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/set 1/);
  });
});
