export type TeamSide = "A" | "B";
export type PlayerId = string;
export type MatchId = string;
export type CourtId = string;

export type MatchStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "DISPUTED"
  | "CANCELLED";

/**
 * Config de scoring del torneo (Tournament.scoring_config, docs/06_MATCH_ENGINE.md §2).
 * tiebreakAt no es un campo separado: en pádel/tenis con tiebreak, siempre
 * dispara al llegar ambos a `gamesPerSet` — hacerlo configurable por
 * separado sería sobre-ingeniería sin caso de uso real.
 */
export interface ScoringConfig {
  /** Sets que hay que ganar para llevarse el partido (2 = mejor de 3). */
  setsToWin: number;
  /** Games por set (normalmente 6). */
  gamesPerSet: number;
  /** Puntos para ganar el tiebreak normal (normalmente 7). */
  tiebreakPoints: number;
  /** Si el set decisivo se juega como super tiebreak en vez de un set completo. */
  finalSetMode: "REGULAR" | "SUPER_TIEBREAK";
  /** Puntos para ganar el super tiebreak (normalmente 10). Solo aplica si finalSetMode = SUPER_TIEBREAK. */
  superTiebreakPoints: number;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  setsToWin: 2,
  gamesPerSet: 6,
  tiebreakPoints: 7,
  finalSetMode: "SUPER_TIEBREAK",
  superTiebreakPoints: 10,
};

export interface SetScoreInput {
  setNumber: number;
  teamAGames: number;
  teamBGames: number;
  tiebreakA?: number | null;
  tiebreakB?: number | null;
}

export interface SetValidationResult {
  valid: boolean;
  winner?: TeamSide;
  reason?: string;
}

export interface MatchValidationResult {
  valid: boolean;
  winner?: TeamSide;
  errors: string[];
}

export interface ResultSubmission {
  submittedBy: PlayerId;
  sets: SetScoreInput[];
  claimedWinner: TeamSide;
}
