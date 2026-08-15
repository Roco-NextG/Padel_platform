import { describe, it, expect } from "vitest";
import { computeTeamRating, expectedScore } from "../src/teamRating";
import { TeamRatingState } from "../src/types";

function team(r1: number, rd1: number, r2: number, rd2: number): TeamRatingState {
  return {
    players: [
      { playerId: "P1", rating: r1, ratingDeviation: rd1 },
      { playerId: "P2", rating: r2, ratingDeviation: rd2 },
    ],
  };
}

describe("computeTeamRating", () => {
  it("promedia simple cuando ambos tienen la misma confianza (RD)", () => {
    const t = team(5.0, 100, 3.0, 100);
    expect(computeTeamRating(t)).toBeCloseTo(4.0, 5);
  });

  it("pesa más al jugador con más confianza (RD más bajo)", () => {
    // P1 muy confiable (RD bajo), P2 muy incierto (RD alto): el rating de
    // equipo debe acercarse más a P1.
    const t = team(6.0, 30, 2.0, 350);
    const teamRating = computeTeamRating(t);
    expect(teamRating).toBeGreaterThan(4.0); // el punto medio simple
    expect(teamRating).toBeCloseTo(6.0, 0); // muy cerca del jugador confiable
  });
});

describe("expectedScore — rival fuerte / rival débil", () => {
  it("expected_score cercano a 0.5 entre equipos iguales", () => {
    expect(expectedScore(4.0, 4.0)).toBeCloseTo(0.5, 5);
  });

  it("expected_score alto quiere decir rival débil", () => {
    const vsWeakRival = expectedScore(6.0, 3.0); // nosotros fuertes, rival débil
    expect(vsWeakRival).toBeGreaterThan(0.85);
  });

  it("expected_score bajo quiere decir rival fuerte", () => {
    const vsStrongRival = expectedScore(3.0, 6.0); // nosotros débiles, rival fuerte
    expect(vsStrongRival).toBeLessThan(0.15);
  });

  it("es simétrico: expected(A,B) + expected(B,A) === 1", () => {
    const a = expectedScore(5.2, 3.8);
    const b = expectedScore(3.8, 5.2);
    expect(a + b).toBeCloseTo(1, 5);
  });
});
