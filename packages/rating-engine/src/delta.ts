import { RATING_CONFIG } from "./config";
import { MatchTypeForRating } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Señal de margen a partir de la diferencia de games (docs/05_RATING_ENGINE.md
 * §3-4: "diferencia de sets/games como señal de margen, no solo victoria
 * binaria"). Un partido muy parejo pesa algo menos que uno holgado; se
 * mantiene acotado para no producir swings desproporcionados por una
 * paliza puntual.
 */
export function computeMarginFactor(gamesWonWinner: number, gamesWonLoser: number): number {
  const total = gamesWonWinner + gamesWonLoser;
  if (total <= 0) return 1;
  const dominance = (gamesWonWinner - gamesWonLoser) / total; // 0..1
  return 0.85 + 0.3 * dominance; // rango aproximado [0.85, 1.15]
}

export interface TeamDeltaParams {
  expected: number;
  actual: 0 | 1;
  /** RD combinado (promedio) del equipo — más incertidumbre, ajustes más grandes. */
  combinedRD: number;
  matchType: MatchTypeForRating;
  marginFactor: number;
}

/**
 * Delta de rating a nivel de EQUIPO (antes del reparto individual del
 * efecto compañero, ver partnerSplit.ts). Sigue el mismo espíritu que
 * Glicko-2: el tamaño del ajuste escala con la incertidumbre (RD) del
 * equipo, no es un K-factor fijo como Elo clásico.
 */
export function computeTeamDelta(params: TeamDeltaParams): number {
  const rdFactor = clamp(
    params.combinedRD / RATING_CONFIG.DEFAULT_RD,
    RATING_CONFIG.MIN_RD_FACTOR,
    RATING_CONFIG.MAX_RD_FACTOR
  );
  const multiplier = RATING_CONFIG.MATCH_TYPE_MULTIPLIERS[params.matchType];
  return (
    RATING_CONFIG.BASE_K *
    rdFactor *
    multiplier *
    params.marginFactor *
    (params.actual - params.expected)
  );
}

/**
 * Update de RD tras un partido: combinación de precisión estilo bayesiano
 * (1/RD² + 1/c²)^-0.5 — el RD baja más rápido cuando era alto (cold start)
 * y cada vez menos a medida que se acerca al piso. No depende de si ganó
 * o perdió: jugar (con resultado confirmado) siempre añade información.
 */
export function updateRatingDeviation(oldRD: number): number {
  const precision = 1 / (oldRD * oldRD) + 1 / (RATING_CONFIG.RD_INFORMATION_CONSTANT ** 2);
  const newRD = Math.sqrt(1 / precision);
  return Math.max(RATING_CONFIG.MIN_RD, newRD);
}
