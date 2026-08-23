import { describe, it, expect } from "vitest";
import { computePartnerWeight } from "../src/partnerSplit";

describe("computePartnerWeight — efecto del compañero (docs/05_RATING_ENGINE.md §5)", () => {
  it("con delta positivo (victoria), el más débil recibe más del 50%", () => {
    const weak = computePartnerWeight(3.0, 5.0, /* teamDelta */ 0.3); // yo soy el débil (3.0 < 5.0)
    const strong = computePartnerWeight(5.0, 3.0, 0.3); // yo soy el fuerte
    expect(weak).toBeGreaterThan(0.5);
    expect(strong).toBeLessThan(0.5);
    expect(weak).toBeGreaterThan(strong);
  });

  it("con delta negativo (derrota), el más débil recibe MENOS penalización relativa", () => {
    const weak = computePartnerWeight(3.0, 5.0, -0.3);
    const strong = computePartnerWeight(5.0, 3.0, -0.3);
    expect(weak).toBeLessThan(0.5); // recibe menos del delta negativo => menos castigo
    expect(strong).toBeGreaterThan(0.5); // el fuerte absorbe más penalización
  });

  it("los pesos de ambos compañeros siempre suman 1 (no se pierde ni duplica el delta)", () => {
    for (const delta of [0.5, -0.5, 0, 0.01, -0.01]) {
      const w1 = computePartnerWeight(4.5, 3.0, delta);
      const w2 = computePartnerWeight(3.0, 4.5, delta);
      expect(w1 + w2).toBeCloseTo(1, 10);
    }
  });

  it("con gap cero (mismo rating) el reparto es 50/50 sin importar el delta", () => {
    expect(computePartnerWeight(4.0, 4.0, 0.4)).toBeCloseTo(0.5, 10);
    expect(computePartnerWeight(4.0, 4.0, -0.4)).toBeCloseTo(0.5, 10);
  });

  it("nunca reparte 0% o 100% aunque el gap sea enorme (acotado por PARTNER_MAX_SKEW)", () => {
    const extremeWeak = computePartnerWeight(1.0, 7.0, 0.5);
    const extremeStrong = computePartnerWeight(7.0, 1.0, 0.5);
    expect(extremeWeak).toBeLessThan(1);
    expect(extremeWeak).toBeGreaterThan(0);
    expect(extremeStrong).toBeGreaterThan(0);
    expect(extremeStrong).toBeLessThan(1);
  });
});
