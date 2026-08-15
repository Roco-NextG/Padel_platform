export type PlayerId = string;
export type MatchId = string;

export type RatingReason = "TOURNAMENT_MATCH" | "COMPETITIVE_MATCH";

/** Los tres niveles de partido del brief (sección 32): multiplicador configurable, no fijo. */
export type MatchTypeForRating = "COMPETITIVE" | "TOURNAMENT" | "MAJOR_TOURNAMENT";

export interface PlayerRatingState {
  playerId: PlayerId;
  /** Escala 1-7 (a definir con negocio, docs/05_RATING_ENGINE.md §6) */
  rating: number;
  /** Rating Deviation: confianza. Alto = poca confianza (cold start). */
  ratingDeviation: number;
}

export interface TeamRatingState {
  players: [PlayerRatingState, PlayerRatingState];
}

export interface RatingMatchInput {
  matchId: MatchId;
  teamA: TeamRatingState;
  teamB: TeamRatingState;
  winner: "A" | "B";
  gamesWonA: number;
  gamesWonB: number;
  matchType: MatchTypeForRating;
  algorithmVersion?: string;
}

export interface RatingEventOutput {
  playerId: PlayerId;
  matchId: MatchId;
  partnerId: PlayerId;
  oldRating: number;
  newRating: number;
  oldRD: number;
  newRD: number;
  reason: RatingReason;
  algorithmVersion: string;
}

export class RatingValidationError extends Error {}
