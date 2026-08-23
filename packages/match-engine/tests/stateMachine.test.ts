import { describe, it, expect } from "vitest";
import { canTransition } from "../src/stateMachine";

describe("canTransition — máquina de estados de Match (docs/06_MATCH_ENGINE.md §6)", () => {
  it("organizador registra directamente: SCHEDULED -> CONFIRMED sin pasar por confirmación", () => {
    expect(canTransition("SCHEDULED", "CONFIRMED")).toBe(true);
    expect(canTransition("IN_PROGRESS", "CONFIRMED")).toBe(true);
  });

  it("flujo normal de confirmación de jugadores", () => {
    expect(canTransition("SCHEDULED", "IN_PROGRESS")).toBe(true);
    expect(canTransition("IN_PROGRESS", "PENDING_CONFIRMATION")).toBe(true);
    expect(canTransition("PENDING_CONFIRMATION", "CONFIRMED")).toBe(true);
  });

  it("discrepancia lleva a DISPUTED, y DISPUTED solo puede resolverse a CONFIRMED o CANCELLED", () => {
    expect(canTransition("PENDING_CONFIRMATION", "DISPUTED")).toBe(true);
    expect(canTransition("DISPUTED", "CONFIRMED")).toBe(true);
    expect(canTransition("DISPUTED", "CANCELLED")).toBe(true);
    expect(canTransition("DISPUTED", "PENDING_CONFIRMATION")).toBe(false);
  });

  it("CONFIRMED y CANCELLED son terminales", () => {
    expect(canTransition("CONFIRMED", "DISPUTED")).toBe(false);
    expect(canTransition("CONFIRMED", "IN_PROGRESS")).toBe(false);
    expect(canTransition("CANCELLED", "SCHEDULED")).toBe(false);
  });

  it("rechaza transiciones que se saltan pasos sin ser el organizador (ej. SCHEDULED -> DISPUTED)", () => {
    expect(canTransition("SCHEDULED", "DISPUTED")).toBe(false);
    expect(canTransition("SCHEDULED", "PENDING_CONFIRMATION")).toBe(false);
  });
});
