import { RATING_CONFIG } from "./config";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Efecto del compañero (docs/05_RATING_ENGINE.md §5 — decisión confirmada
 * desde el día 1 del MVP).
 *
 * Reparte el delta de EQUIPO entre los dos jugadores de forma desigual
 * según el gap de rating con su compañero:
 *
 *   - Si el equipo GANA rating (delta >= 0): el jugador más débil de la
 *     pareja recibe una porción MAYOR del delta positivo (tuvo más "margen
 *     de sorpresa").
 *   - Si el equipo PIERDE rating (delta < 0): el jugador más débil recibe
 *     una porción MENOR del delta negativo (se le penaliza menos por
 *     perder acompañado de alguien más fuerte); el más fuerte absorbe más
 *     penalización relativa ("se esperaba que su pareja ganara").
 *
 * Por construcción (ver test), weight(selfRating, partnerRating, delta) +
 * weight(partnerRating, selfRating, delta) === 1 siempre — el delta de
 * equipo se reparte completo entre los dos, nunca se pierde ni se duplica.
 */
export function computePartnerWeight(
  selfRating: number,
  partnerRating: number,
  teamDelta: number
): number {
  const gap = selfRating - partnerRating;
  const normalizedGap = clamp(gap / RATING_CONFIG.PARTNER_GAP_SCALE, -1, 1);
  const skew = RATING_CONFIG.PARTNER_MAX_SKEW * normalizedGap;

  // gap negativo => selfRating < partnerRating => es el jugador más débil.
  if (teamDelta >= 0) {
    // Delta positivo: el más débil (gap negativo) recibe MÁS que 0.5.
    return 0.5 - skew;
  }
  // Delta negativo: el más débil (gap negativo) recibe MENOS que 0.5.
  return 0.5 + skew;
}
