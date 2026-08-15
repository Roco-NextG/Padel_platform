import { describe, it, expect } from "vitest";
import { validateRegularSet, validateTiebreakScore } from "../src/scoreValidation";
import { DEFAULT_SCORING_CONFIG } from "../src/types";

describe("validateTiebreakScore", () => {
  it("acepta 7-0 hasta 7-5 (gana en el mínimo, diferencia >=2)", () => {
    for (const loser of [0, 1, 2, 3, 4, 5]) {
      expect(validateTiebreakScore(7, loser, 7).valid).toBe(true);
    }
  });

  it("rechaza 7-6 (no cumple diferencia de 2 en el mínimo)", () => {
    expect(validateTiebreakScore(7, 6, 7).valid).toBe(false);
  });

  it("acepta el tiebreak extendido con diferencia exacta de 2 (9-7)", () => {
    expect(validateTiebreakScore(9, 7, 7).valid).toBe(true);
  });

  it("rechaza el tiebreak extendido con diferencia distinta de 2 (9-6)", () => {
    expect(validateTiebreakScore(9, 6, 7).valid).toBe(false);
  });

  it("rechaza empate", () => {
    expect(validateTiebreakScore(6, 6, 7).valid).toBe(false);
  });
});

describe("validateRegularSet — resultado válido por formato de scoring", () => {
  it("acepta un 6-4 sin tiebreak", () => {
    const r = validateRegularSet(
      { setNumber: 1, teamAGames: 6, teamBGames: 4 },
      DEFAULT_SCORING_CONFIG
    );
    expect(r.valid).toBe(true);
    expect(r.winner).toBe("A");
  });

  it("acepta un 7-5 (ventaja sin tiebreak)", () => {
    const r = validateRegularSet(
      { setNumber: 1, teamAGames: 7, teamBGames: 5 },
      DEFAULT_SCORING_CONFIG
    );
    expect(r.valid).toBe(true);
  });

  it("acepta un 7-6 CON tiebreak válido registrado", () => {
    const r = validateRegularSet(
      { setNumber: 1, teamAGames: 7, teamBGames: 6, tiebreakA: 7, tiebreakB: 3 },
      DEFAULT_SCORING_CONFIG
    );
    expect(r.valid).toBe(true);
    expect(r.winner).toBe("A");
  });
});

describe("validateRegularSet — resultado con set en empate sin tiebreak: rechazado", () => {
  it("rechaza 6-6 sin tiebreak (empate de games sin resolver)", () => {
    const r = validateRegularSet(
      { setNumber: 1, teamAGames: 6, teamBGames: 6 },
      DEFAULT_SCORING_CONFIG
    );
    expect(r.valid).toBe(false);
  });

  it("rechaza 7-6 SIN tiebreak registrado", () => {
    const r = validateRegularSet(
      { setNumber: 1, teamAGames: 7, teamBGames: 6 },
      DEFAULT_SCORING_CONFIG
    );
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/tiebreak/);
  });
});

describe("validateRegularSet — otros marcadores inválidos", () => {
  it("rechaza 6-5 (no llegó a diferencia de 2 ni a tiebreak)", () => {
    expect(validateRegularSet({ setNumber: 1, teamAGames: 6, teamBGames: 5 }, DEFAULT_SCORING_CONFIG).valid).toBe(false);
  });

  it("rechaza 8-6 (se pasó del techo sin pasar por tiebreak)", () => {
    expect(validateRegularSet({ setNumber: 1, teamAGames: 8, teamBGames: 6 }, DEFAULT_SCORING_CONFIG).valid).toBe(false);
  });

  it("rechaza 5-3 (nadie llegó a los games requeridos)", () => {
    expect(validateRegularSet({ setNumber: 1, teamAGames: 5, teamBGames: 3 }, DEFAULT_SCORING_CONFIG).valid).toBe(false);
  });

  it("rechaza un 6-2 con un tiebreak registrado de más", () => {
    const r = validateRegularSet(
      { setNumber: 1, teamAGames: 6, teamBGames: 2, tiebreakA: 7, tiebreakB: 3 },
      DEFAULT_SCORING_CONFIG
    );
    expect(r.valid).toBe(false);
  });

  it("rechaza games negativos o no enteros", () => {
    expect(validateRegularSet({ setNumber: 1, teamAGames: -1, teamBGames: 6 }, DEFAULT_SCORING_CONFIG).valid).toBe(false);
    expect(validateRegularSet({ setNumber: 1, teamAGames: 6.5, teamBGames: 4 }, DEFAULT_SCORING_CONFIG).valid).toBe(false);
  });
});
