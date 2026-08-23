import { describe, it, expect } from "vitest";
import { computeConfirmationStatus, detectDiscrepancy } from "../src/confirmationFlow";
import { detectCourtConflicts } from "../src/stateMachine";
import { ResultSubmission } from "../src/types";

describe("computeConfirmationStatus", () => {
  it("confirmación parcial (2 de 4) permanece PENDING_CONFIRMATION", () => {
    const status = computeConfirmationStatus([
      { playerId: "P1", confirmed: true },
      { playerId: "P2", confirmed: true },
      { playerId: "P3", confirmed: null },
      { playerId: "P4", confirmed: null },
    ]);
    expect(status).toBe("PENDING_CONFIRMATION");
  });

  it("los 4 confirman -> CONFIRMED", () => {
    const status = computeConfirmationStatus([
      { playerId: "P1", confirmed: true },
      { playerId: "P2", confirmed: true },
      { playerId: "P3", confirmed: true },
      { playerId: "P4", confirmed: true },
    ]);
    expect(status).toBe("CONFIRMED");
  });

  it("un solo rechazo explícito -> DISPUTED, sin importar los demás", () => {
    const status = computeConfirmationStatus([
      { playerId: "P1", confirmed: true },
      { playerId: "P2", confirmed: false },
      { playerId: "P3", confirmed: true },
      { playerId: "P4", confirmed: null },
    ]);
    expect(status).toBe("DISPUTED");
  });
});

describe("detectDiscrepancy — resultados distintos entre jugadores", () => {
  it("sin discrepancia si todos registran lo mismo (aunque en distinto orden de sets)", () => {
    const submissions: ResultSubmission[] = [
      {
        submittedBy: "P1",
        claimedWinner: "A",
        sets: [
          { setNumber: 1, teamAGames: 6, teamBGames: 4 },
          { setNumber: 2, teamAGames: 6, teamBGames: 3 },
        ],
      },
      {
        submittedBy: "P3",
        claimedWinner: "A",
        sets: [
          { setNumber: 2, teamAGames: 6, teamBGames: 3 },
          { setNumber: 1, teamAGames: 6, teamBGames: 4 },
        ],
      },
    ];
    expect(detectDiscrepancy(submissions).hasDiscrepancy).toBe(false);
  });

  it("detecta discrepancia cuando dos jugadores registran resultados distintos -> DISPUTED", () => {
    const submissions: ResultSubmission[] = [
      {
        submittedBy: "P1",
        claimedWinner: "A",
        sets: [
          { setNumber: 1, teamAGames: 6, teamBGames: 4 },
          { setNumber: 2, teamAGames: 6, teamBGames: 3 },
        ],
      },
      {
        submittedBy: "P3",
        claimedWinner: "B", // Bruno dice que ganó el equipo B
        sets: [
          { setNumber: 1, teamAGames: 4, teamBGames: 6 },
          { setNumber: 2, teamAGames: 3, teamBGames: 6 },
        ],
      },
    ];
    const result = detectDiscrepancy(submissions);
    expect(result.hasDiscrepancy).toBe(true);
  });
});

describe("detectCourtConflicts — advertencia, no bloqueo", () => {
  it("detecta dos partidos IN_PROGRESS en la misma pista", () => {
    const conflicts = detectCourtConflicts([
      { matchId: "M1", courtId: "C1", status: "IN_PROGRESS" },
      { matchId: "M2", courtId: "C1", status: "IN_PROGRESS" },
      { matchId: "M3", courtId: "C2", status: "IN_PROGRESS" },
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].courtId).toBe("C1");
    expect(conflicts[0].matchIds).toEqual(["M1", "M2"]);
  });

  it("no reporta conflicto si solo uno está IN_PROGRESS (otro SCHEDULED)", () => {
    const conflicts = detectCourtConflicts([
      { matchId: "M1", courtId: "C1", status: "IN_PROGRESS" },
      { matchId: "M2", courtId: "C1", status: "SCHEDULED" },
    ]);
    expect(conflicts).toHaveLength(0);
  });

  it("la función solo informa, no impide construir la lista de partidos igual", () => {
    // el propio hecho de que devuelva un array (no lance excepción) es la
    // garantía de que esto es una advertencia, no un bloqueo duro.
    expect(() =>
      detectCourtConflicts([
        { matchId: "M1", courtId: "C1", status: "IN_PROGRESS" },
        { matchId: "M2", courtId: "C1", status: "IN_PROGRESS" },
      ])
    ).not.toThrow();
  });
});
