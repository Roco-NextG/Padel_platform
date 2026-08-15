import { describe, it, expect } from "vitest";
import { generateBracket } from "../src/bracket";
import {
  advanceBracket,
  initializeBracketRounds,
  isFinalRound,
  isMatchReady,
} from "../src/bracketProgression";
import { SeededTeam } from "../src/types";

function makeTeams(n: number): SeededTeam[] {
  return Array.from({ length: n }, (_, i) => ({ teamId: `T${i + 1}`, seed: i + 1 }));
}

describe("initializeBracketRounds — 8 parejas, sin bye", () => {
  const bracket = generateBracket(makeTeams(8));
  const rounds = initializeBracketRounds(bracket);

  it("genera 3 rondas (cuartos, semis, final) para 8 parejas", () => {
    expect(rounds).toHaveLength(3);
    expect(rounds.map((r) => r.matches.length)).toEqual([4, 2, 1]);
  });

  it("la ronda 1 sale directa del bracket inicial, las siguientes arrancan vacías", () => {
    expect(rounds[0].matches.every((m) => m.teamAId && m.teamBId)).toBe(true);
    expect(rounds[1].matches.every((m) => m.teamAId === null && m.teamBId === null)).toBe(true);
    expect(rounds[2].matches.every((m) => m.teamAId === null && m.teamBId === null)).toBe(true);
  });
});

describe("advanceBracket — flujo completo hasta el campeón (8 parejas)", () => {
  it("propaga ganadores ronda a ronda hasta que la final tiene ambos equipos", () => {
    const bracket = generateBracket(makeTeams(8));
    let rounds = initializeBracketRounds(bracket);

    // Ronda 1: confirmar los 4 partidos, siempre gana teamA de cada cruce
    const round1Winners: { matchIndex: number; winnerTeamId: string }[] = rounds[0].matches.map(
      (m) => ({ matchIndex: m.matchIndex, winnerTeamId: m.teamAId! })
    );
    for (const w of round1Winners) {
      rounds = advanceBracket(rounds, { round: 1, matchIndex: w.matchIndex, winnerTeamId: w.winnerTeamId });
    }

    // Ronda 2 (semis) ya debería tener ambos equipos en sus 2 partidos
    expect(isMatchReady(rounds[1], 0)).toBe(true);
    expect(isMatchReady(rounds[1], 1)).toBe(true);
    // La final todavía no
    expect(isMatchReady(rounds[2], 0)).toBe(false);

    // Confirmar las 2 semis
    const semiWinners = rounds[1].matches.map((m) => ({ matchIndex: m.matchIndex, winnerTeamId: m.teamAId! }));
    for (const w of semiWinners) {
      rounds = advanceBracket(rounds, { round: 2, matchIndex: w.matchIndex, winnerTeamId: w.winnerTeamId });
    }

    expect(isMatchReady(rounds[2], 0)).toBe(true);
    expect(isFinalRound(rounds, 3)).toBe(true);
    expect(isFinalRound(rounds, 2)).toBe(false);
  });

  it("nunca muta el array de rounds original (devuelve copia)", () => {
    const bracket = generateBracket(makeTeams(8));
    const rounds = initializeBracketRounds(bracket);
    const snapshot = JSON.stringify(rounds);

    advanceBracket(rounds, { round: 1, matchIndex: 0, winnerTeamId: rounds[0].matches[0].teamAId! });

    expect(JSON.stringify(rounds)).toBe(snapshot);
  });
});

describe("initializeBracketRounds — con bye (12 parejas, bracket de 16)", () => {
  it("propaga los byes de la ronda 1 a la ronda 2 sin necesitar advanceBracket", () => {
    const bracket = generateBracket(makeTeams(12));
    const rounds = initializeBracketRounds(bracket);

    expect(bracket.byes).toBe(4);
    const byeMatches = rounds[0].matches.filter((m) => m.isByeMatch);
    expect(byeMatches).toHaveLength(4);

    // Cada equipo que pasó por bye ya debería aparecer como teamA o teamB
    // en algún partido de la ronda 2, sin que se haya llamado advanceBracket.
    const round2Teams = rounds[1].matches.flatMap((m) => [m.teamAId, m.teamBId]).filter(Boolean);
    for (const bye of byeMatches) {
      expect(round2Teams).toContain(bye.autoAdvanceTeamId);
    }
  });

  it("mezcla de bye (ya colocado) y partido real (via advanceBracket) puede dejar un partido de ronda 2 listo", () => {
    const bracket = generateBracket(makeTeams(12));
    let rounds = initializeBracketRounds(bracket);

    // encontrar un partido de ronda 2 que ya tenga UN lado resuelto por bye
    const partiallyFilled = rounds[1].matches.find(
      (m) => (m.teamAId === null) !== (m.teamBId === null)
    );
    expect(partiallyFilled).toBeDefined();

    // encontrar en ronda 1 el partido real (no-bye) que alimenta ese slot
    const feedingReal = rounds[0].matches.find(
      (m) => !m.isByeMatch && Math.floor(m.matchIndex / 2) === partiallyFilled!.matchIndex
    );
    expect(feedingReal).toBeDefined();

    rounds = advanceBracket(rounds, {
      round: 1,
      matchIndex: feedingReal!.matchIndex,
      winnerTeamId: feedingReal!.teamAId!,
    });

    expect(isMatchReady(rounds[1], partiallyFilled!.matchIndex)).toBe(true);
  });
});

describe("initializeBracketRounds — rechaza tamaños de bracket inválidos", () => {
  it("lanza si bracketSize no es potencia de 2", () => {
    expect(() =>
      initializeBracketRounds({
        bracketSize: 6,
        byes: 0,
        slots: [],
        firstRoundMatches: [],
        unresolvedGroupConflicts: [],
      })
    ).toThrow();
  });
});
