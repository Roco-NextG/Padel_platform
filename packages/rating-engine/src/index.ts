export * from "./types";
export * from "./config";
export * from "./teamRating";
export * from "./delta";
export * from "./partnerSplit";
export * from "./engine";

import { RATING_CONFIG } from "./config";
import { PlayerRatingState } from "./types";

/** Estado inicial de un jugador nuevo (cold start, docs/05_RATING_ENGINE.md §6). */
export function createColdStartRating(playerId: string): PlayerRatingState {
  return {
    playerId,
    rating: RATING_CONFIG.DEFAULT_RATING,
    ratingDeviation: RATING_CONFIG.DEFAULT_RD,
  };
}

/** `Confianza: Alta` cuando el RD baja del umbral; `Baja` mientras tanto (§6). */
export function confidenceLabel(ratingDeviation: number): "Alta" | "Baja" {
  const threshold = (RATING_CONFIG.DEFAULT_RD + RATING_CONFIG.MIN_RD) / 4;
  return ratingDeviation <= threshold ? "Alta" : "Baja";
}
