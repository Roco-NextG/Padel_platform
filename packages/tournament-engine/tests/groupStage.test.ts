import { describe, it, expect } from "vitest";
import { generateGroupMatches, distributeIntoGroups } from "../src/groupStage";

describe("generateGroupMatches", () => {
  it("genera g*(g-1)/2 partidos para un grupo de tamaño g", () => {
    const teamIds = ["A", "B", "C", "D"];
    const matches = generateGroupMatches(teamIds);
    expect(matches).toHaveLength(6); // 4*3/2
  });

  it("cada equipo juega contra todos los demás exactamente una vez", () => {
    const teamIds = ["A", "B", "C", "D"];
    const matches = generateGroupMatches(teamIds);
    const seen = new Set<string>();
    for (const [a, b] of matches) {
      const key = [a, b].sort().join("-");
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    expect(seen.size).toBe(6);
  });
});

describe("distributeIntoGroups", () => {
  it("distribuye N equipos en grupos de tamaño objetivo (serpentina)", () => {
    const teams = Array.from({ length: 16 }, (_, i) => ({
      id: `T${i + 1}`,
      initialSeed: i + 1,
    }));
    const groups = distributeIntoGroups(teams, 4);
    const groupNames = Object.keys(groups);
    expect(groupNames).toHaveLength(4);
    for (const name of groupNames) {
      expect(groups[name]).toHaveLength(4);
    }
  });

  it("es determinista: la misma entrada produce siempre la misma distribución", () => {
    const teams = Array.from({ length: 12 }, (_, i) => ({ id: `T${i + 1}` }));
    const groups1 = distributeIntoGroups(teams, 4, 7);
    const groups2 = distributeIntoGroups(teams, 4, 7);
    expect(groups1).toEqual(groups2);
  });
});
