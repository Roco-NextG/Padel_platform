import { MatchTypeForRating } from "./types";

/**
 * Constantes de calibración. Ninguna está congelada — se ajustan con datos
 * reales de los primeros torneos piloto (docs/05_RATING_ENGINE.md §5,
 * "Nota de calibración"). Se centralizan aquí para no quedar hardcodeadas
 * dispersas por el código.
 */
export const RATING_CONFIG = {
  /** Rating inicial de un jugador nuevo (cold start, §6 del spec). */
  DEFAULT_RATING: 4.0,

  /**
   * RD inicial de un jugador nuevo. Se usa también como el RD "de referencia"
   * (rdFactor = 1) para escalar el tamaño de los ajustes de rating.
   */
  DEFAULT_RD: 350,

  /** Piso de RD: nunca baja de aquí por más partidos que se jueguen. */
  MIN_RD: 30,

  /**
   * Constante de "información por partido" para el update de RD, en el
   * espíritu de una combinación bayesiana de precisión (1/RD² + 1/c²).
   * Más bajo = la confianza sube más rápido con cada partido.
   */
  RD_INFORMATION_CONSTANT: 60,

  /** Límites del factor de velocidad de ajuste derivado del RD combinado del equipo. */
  MIN_RD_FACTOR: 0.15,
  MAX_RD_FACTOR: 1.5,

  /**
   * Tamaño base del ajuste de rating de equipo, en la escala 1-7.
   *
   * NOTA DE CORRECCIÓN respecto al brief original: la fórmula de
   * expected_score del brief (sección 3) usa un divisor de 400, calibrado
   * para escalas tipo Elo (cientos de puntos, ej. 1200-2400). En una escala
   * 1-7 ese divisor haría que expected_score casi nunca se aleje de 0.5,
   * sin importar la diferencia real de nivel. Lo reemplazo por
   * EXPECTED_SCORE_DIVISOR = 2.0, calibrado para que una diferencia de ~2
   * puntos de rating (una brecha de nivel importante en la escala 1-7)
   * ya implique un expected_score de ~0.9. Configurable, no fijo — mismo
   * criterio de "no fijar coeficientes sin datos reales" (sección 32 del brief).
   */
  EXPECTED_SCORE_DIVISOR: 2.0,

  BASE_K: 0.5,

  /** Multiplicadores por tipo de partido (sección 32 del brief). Configurables. */
  MATCH_TYPE_MULTIPLIERS: {
    COMPETITIVE: 1.0,
    TOURNAMENT: 1.2,
    MAJOR_TOURNAMENT: 1.5,
  } satisfies Record<MatchTypeForRating, number>,

  /** Cuánta diferencia de rating con el compañero (en puntos) satura el efecto compañero. */
  PARTNER_GAP_SCALE: 1.5,

  /** Máximo desvío del reparto 50/50 entre compañeros (nunca 0%/100%). */
  PARTNER_MAX_SKEW: 0.35,

  ALGORITHM_VERSION: "v1-partner-effect",
} as const;

export function matchTypeToReason(matchType: MatchTypeForRating): "TOURNAMENT_MATCH" | "COMPETITIVE_MATCH" {
  return matchType === "COMPETITIVE" ? "COMPETITIVE_MATCH" : "TOURNAMENT_MATCH";
}
