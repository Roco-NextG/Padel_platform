import { describe, it, expect } from "vitest";
import { applyMatchResult, replayRatingHistory } from "../src/engine";
import { createColdStartRating } from "../src/index";
import { RatingValidationError, PlayerRatingState, RatingMatchInput } from "../src/types";
import { RATING_CONFIG } from "../src/config";

function established(playerId: string, rating: number): PlayerRatingState {
  return { playerId, rating, ratingDeviation: RATING_CONFIG.MIN_RD };
}

describe("applyMatchResult — victoria / derrota (signo correcto del delta)", () => {
  it("el equipo ganador sube de rating, el perdedor baja, entre equipos parejos", () => {
    const teamA = { players: [established("A1", 4.0), established("A2", 4.0)] as [any, any] };
    const teamB = { players: [established("B1", 4.0), established("B2", 4.0)] as [any, any] };

    const events = applyMatchResult({
      matchId: "M1",
      teamA,
      teamB,
      winner: "A",
      gamesWonA: 12,
      gamesWonB: 4,
      matchType: "TOURNAMENT",
    });

    const a1 = events.find((e) => e.playerId === "A1")!;
    const b1 = events.find((e) => e.playerId === "B1")!;
    expect(a1.newRating).toBeGreaterThan(a1.oldRating);
    expect(b1.newRating).toBeLessThan(b1.oldRating);
  });

  it("genera exactamente 4 RatingEvent por partido (2 por equipo)", () => {
    const teamA = { players: [established("A1", 4.0), established("A2", 4.0)] as [any, any] };
    const teamB = { players: [established("B1", 4.0), established("B2", 4.0)] as [any, any] };
    const events = applyMatchResult({
      matchId: "M1", teamA, teamB, winner: "A",
      gamesWonA: 12, gamesWonB: 4, matchType: "COMPETITIVE",
    });
    expect(events).toHaveLength(4);
    expect(new Set(events.map((e) => e.playerId)).size).toBe(4);
  });
});

describe("applyMatchResult — cold start", () => {
  it("un jugador nuevo (RD alto) se mueve más por partido que uno establecido, en igualdad de condiciones", () => {
    const newPlayerMatch: RatingMatchInput = {
      matchId: "M-new",
      teamA: { players: [createColdStartRating("NEW1"), createColdStartRating("NEW2")] },
      teamB: { players: [createColdStartRating("R1"), createColdStartRating("R2")] },
      winner: "A",
      gamesWonA: 12,
      gamesWonB: 8,
      matchType: "TOURNAMENT",
    };
    const establishedMatch: RatingMatchInput = {
      matchId: "M-est",
      teamA: { players: [established("EST1", 4.0), established("EST2", 4.0)] },
      teamB: { players: [established("ER1", 4.0), established("ER2", 4.0)] },
      winner: "A",
      gamesWonA: 12,
      gamesWonB: 8,
      matchType: "TOURNAMENT",
    };

    const newEvents = applyMatchResult(newPlayerMatch);
    const estEvents = applyMatchResult(establishedMatch);

    const newMovement = Math.abs(newEvents[0].newRating - newEvents[0].oldRating);
    const estMovement = Math.abs(estEvents[0].newRating - estEvents[0].oldRating);
    expect(newMovement).toBeGreaterThan(estMovement);
  });

  it("el RD baja tras jugar (gana confianza) pero nunca por debajo del piso", () => {
    const events = applyMatchResult({
      matchId: "M1",
      teamA: { players: [createColdStartRating("N1"), createColdStartRating("N2")] },
      teamB: { players: [createColdStartRating("N3"), createColdStartRating("N4")] },
      winner: "A",
      gamesWonA: 12,
      gamesWonB: 6,
      matchType: "TOURNAMENT",
    });
    for (const e of events) {
      expect(e.newRD).toBeLessThan(e.oldRD);
      expect(e.newRD).toBeGreaterThanOrEqual(RATING_CONFIG.MIN_RD);
    }
  });
});

describe("applyMatchResult — pareja desigual (efecto compañero end-to-end)", () => {
  it("el jugador más débil de la pareja ganadora recibe mayor variación relativa que el más fuerte", () => {
    const events = applyMatchResult({
      matchId: "M1",
      teamA: {
        players: [established("STRONG", 5.5), established("WEAK", 3.0)],
      },
      teamB: {
        players: [established("C1", 4.25), established("C2", 4.25)],
      },
      winner: "A",
      gamesWonA: 12,
      gamesWonB: 10,
      matchType: "TOURNAMENT",
    });
    const strong = events.find((e) => e.playerId === "STRONG")!;
    const weak = events.find((e) => e.playerId === "WEAK")!;
    const strongGain = strong.newRating - strong.oldRating;
    const weakGain = weak.newRating - weak.oldRating;
    expect(weakGain).toBeGreaterThan(strongGain);
  });
});

describe("applyMatchResult — resultado inválido", () => {
  const validTeam = () => ({
    players: [established("X1", 4.0), established("X2", 4.0)] as [any, any],
  });

  it("rechaza winner inválido", () => {
    expect(() =>
      applyMatchResult({
        matchId: "M1",
        teamA: validTeam(),
        teamB: validTeam(),
        winner: "C" as any,
        gamesWonA: 6,
        gamesWonB: 4,
        matchType: "TOURNAMENT",
      })
    ).toThrow(RatingValidationError);
  });

  it("rechaza games negativos", () => {
    expect(() =>
      applyMatchResult({
        matchId: "M1",
        teamA: validTeam(),
        teamB: validTeam(),
        winner: "A",
        gamesWonA: -1,
        gamesWonB: 4,
        matchType: "TOURNAMENT",
      })
    ).toThrow(RatingValidationError);
  });

  it("rechaza un jugador repetido en el mismo equipo", () => {
    expect(() =>
      applyMatchResult({
        matchId: "M1",
        teamA: { players: [established("DUP", 4.0), established("DUP", 4.0)] },
        teamB: validTeam(),
        winner: "A",
        gamesWonA: 6,
        gamesWonB: 4,
        matchType: "TOURNAMENT",
      })
    ).toThrow(RatingValidationError);
  });

  it("rechaza un jugador presente en ambos equipos", () => {
    const shared = established("SHARED", 4.0);
    expect(() =>
      applyMatchResult({
        matchId: "M1",
        teamA: { players: [shared, established("A2", 4.0)] },
        teamB: { players: [shared, established("B2", 4.0)] },
        winner: "A",
        gamesWonA: 6,
        gamesWonB: 4,
        matchType: "TOURNAMENT",
      })
    ).toThrow(RatingValidationError);
  });
});

describe("replayRatingHistory — recalculo en cadena (docs/05_RATING_ENGINE.md §8)", () => {
  it("encadena el estado de cada jugador partido a partido", () => {
    const initial = {
      A1: established("A1", 4.0),
      A2: established("A2", 4.0),
      B1: established("B1", 4.0),
      B2: established("B2", 4.0),
    };

    const match1: RatingMatchInput = {
      matchId: "M1",
      teamA: { players: [initial.A1, initial.A2] },
      teamB: { players: [initial.B1, initial.B2] },
      winner: "A",
      gamesWonA: 12,
      gamesWonB: 6,
      matchType: "TOURNAMENT",
    };
    // Partido 2: A1 juega de nuevo, con el rating que le quedó del partido 1
    // (se referencia por playerId; replayRatingHistory resuelve el estado vivo).
    const match2: RatingMatchInput = {
      matchId: "M2",
      teamA: { players: [initial.A1, established("A3", 4.0)] },
      teamB: { players: [established("C1", 4.0), established("C2", 4.0)] },
      winner: "A",
      gamesWonA: 12,
      gamesWonB: 8,
      matchType: "TOURNAMENT",
    };

    const events = replayRatingHistory([match1, match2], initial);
    const a1EventM1 = events.find((e) => e.playerId === "A1" && e.matchId === "M1")!;
    const a1EventM2 = events.find((e) => e.playerId === "A1" && e.matchId === "M2")!;

    // El rating inicial del partido 2 para A1 debe ser el resultante del partido 1,
    // no el rating original de 4.0.
    expect(a1EventM2.oldRating).toBeCloseTo(a1EventM1.newRating, 2);
  });

  it("recalcular desde un punto de corrección reproduce el mismo resultado que un cálculo directo desde ahí", () => {
    const initial = {
      A1: established("A1", 4.2),
      A2: established("A2", 3.8),
      B1: established("B1", 4.0),
      B2: established("B2", 4.0),
    };
    const match: RatingMatchInput = {
      matchId: "M1",
      teamA: { players: [initial.A1, initial.A2] },
      teamB: { players: [initial.B1, initial.B2] },
      winner: "B", // resultado CORREGIDO tras la disputa
      gamesWonA: 8,
      gamesWonB: 12,
      matchType: "TOURNAMENT",
    };

    const viaReplay = replayRatingHistory([match], initial);
    const viaDirect = applyMatchResult(match);

    expect(viaReplay).toEqual(viaDirect);
  });
});
