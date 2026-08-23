import { RATING_CONFIG } from "./config";
import { TeamRatingState } from "./types";

/**
 * team_rating = promedio ponderado por precisión (1/RD²): el jugador con
 * más confianza (RD más bajo) pesa más (docs/05_RATING_ENGINE.md §3).
 */
export function computeTeamRating(team: TeamRatingState): number {
  const [p1, p2] = team.players;
  const w1 = 1 / (p1.ratingDeviation * p1.ratingDeviation);
  const w2 = 1 / (p2.ratingDeviation * p2.ratingDeviation);
  return (p1.rating * w1 + p2.rating * w2) / (w1 + w2);
}

/**
 * Probabilidad esperada de victoria del equipo propio, dado su rating de
 * equipo y el del rival. Ver config.ts para la nota sobre EXPECTED_SCORE_DIVISOR
 * (corrección respecto al divisor /400 del brief, calibrado para escala Elo).
 */
export function expectedScore(
  ownTeamRating: number,
  opponentTeamRating: number,
  divisor: number = RATING_CONFIG.EXPECTED_SCORE_DIVISOR
): number {
  return 1 / (1 + Math.pow(10, (opponentTeamRating - ownTeamRating) / divisor));
}
