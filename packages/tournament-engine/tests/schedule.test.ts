import { describe, it, expect } from "vitest";
import { generateRoundRobinSchedule } from "../src/schedule";

function allPairs(teamIds: string[]): Set<string> {
  const pairs = new Set<string>();
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      pairs.add([teamIds[i], teamIds[j]].sort().join("-"));
    }
  }
  return pairs;
}

describe("generateRoundRobinSchedule — cantidad par de equipos", () => {
  const teamIds = ["A", "B", "C", "D"];

  it("produce n-1 rondas", () => {
    const rounds = generateRoundRobinSchedule(teamIds);
    expect(rounds).toHaveLength(3);
  });

  it("cada ronda tiene n/2 partidos y ningún descanso", () => {
    const rounds = generateRoundRobinSchedule(teamIds);
    for (const round of rounds) {
      expect(round.matches).toHaveLength(2);
      expect(round.byeTeamId).toBeNull();
    }
  });

  it("cada par de equipos se enfrenta exactamente una vez en todo el calendario", () => {
    const rounds = generateRoundRobinSchedule(teamIds);
    const seen = new Set<string>();
    for (const round of rounds) {
      for (const [a, b] of round.matches) {
        const key = [a, b].sort().join("-");
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
    expect(seen).toEqual(allPairs(teamIds));
  });

  it("cada equipo juega exactamente una vez por ronda", () => {
    const rounds = generateRoundRobinSchedule(teamIds);
    for (const round of rounds) {
      const playing = round.matches.flat();
      expect(new Set(playing).size).toBe(playing.length);
      expect(playing).toHaveLength(teamIds.length);
    }
  });
});

describe("generateRoundRobinSchedule — cantidad impar de equipos (con descansos)", () => {
  const teamIds = ["A", "B", "C", "D", "E"];

  it("produce n rondas (una más que con cantidad par, por el descanso ficticio)", () => {
    const rounds = generateRoundRobinSchedule(teamIds);
    expect(rounds).toHaveLength(5);
  });

  it("cada ronda tiene (n-1)/2 partidos y exactamente un equipo libre", () => {
    const rounds = generateRoundRobinSchedule(teamIds);
    for (const round of rounds) {
      expect(round.matches).toHaveLength(2);
      expect(round.byeTeamId).not.toBeNull();
    }
  });

  it("cada equipo descansa exactamente una vez en todo el calendario", () => {
    const rounds = generateRoundRobinSchedule(teamIds);
    const byes = rounds.map((r) => r.byeTeamId);
    expect(new Set(byes).size).toBe(teamIds.length);
    expect(new Set(byes)).toEqual(new Set(teamIds));
  });

  it("cada par de equipos se enfrenta exactamente una vez en todo el calendario", () => {
    const rounds = generateRoundRobinSchedule(teamIds);
    const seen = new Set<string>();
    for (const round of rounds) {
      for (const [a, b] of round.matches) {
        const key = [a, b].sort().join("-");
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
    expect(seen).toEqual(allPairs(teamIds));
  });
});

describe("generateRoundRobinSchedule — casos borde", () => {
  it("con menos de 2 equipos no genera ninguna ronda", () => {
    expect(generateRoundRobinSchedule([])).toEqual([]);
    expect(generateRoundRobinSchedule(["A"])).toEqual([]);
  });

  it("con 2 equipos genera 1 ronda con 1 partido", () => {
    const rounds = generateRoundRobinSchedule(["A", "B"]);
    expect(rounds).toEqual([{ matches: [["A", "B"]], byeTeamId: null }]);
  });

  it("es determinista: la misma entrada produce siempre el mismo calendario", () => {
    const teamIds = ["A", "B", "C", "D", "E", "F"];
    expect(generateRoundRobinSchedule(teamIds)).toEqual(generateRoundRobinSchedule(teamIds));
  });
});
