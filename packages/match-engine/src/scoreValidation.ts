import { ScoringConfig, SetScoreInput, SetValidationResult, TeamSide } from "./types";

function invalid(reason: string): SetValidationResult {
  return { valid: false, reason };
}

function isNonNegInt(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0;
}

/**
 * Valida un tiebreak (normal o super tiebreak, misma matemática con distinto
 * umbral de puntos): hay que llegar al mínimo de puntos Y ganar por al menos
 * 2 — si se pasa del mínimo, la diferencia debe ser EXACTAMENTE 2 (en el
 * momento en que se alcanza esa diferencia el tiebreak termina, no puede
 * haber un salto mayor).
 */
export function validateTiebreakScore(
  pointsA: number,
  pointsB: number,
  requiredPoints: number
): SetValidationResult {
  if (!isNonNegInt(pointsA) || !isNonNegInt(pointsB)) {
    return invalid("los puntos del tiebreak deben ser enteros no negativos");
  }
  if (pointsA === pointsB) {
    return invalid("un tiebreak no puede terminar empatado");
  }

  const winnerIsA = pointsA > pointsB;
  const winnerPoints = Math.max(pointsA, pointsB);
  const loserPoints = Math.min(pointsA, pointsB);
  const diff = winnerPoints - loserPoints;

  if (winnerPoints < requiredPoints) {
    return invalid(`el tiebreak requiere al menos ${requiredPoints} puntos para el ganador`);
  }
  if (winnerPoints === requiredPoints) {
    if (diff < 2) {
      return invalid("el tiebreak debe ganarse por al menos 2 puntos de diferencia");
    }
    return { valid: true, winner: winnerIsA ? "A" : "B" };
  }
  // winnerPoints > requiredPoints: tiebreak extendido, la diferencia debe ser EXACTAMENTE 2
  if (diff !== 2) {
    return invalid(
      "en un tiebreak extendido más allá del mínimo, la diferencia debe ser exactamente 2"
    );
  }
  return { valid: true, winner: winnerIsA ? "A" : "B" };
}

/**
 * Valida un set "de juegos" normal (docs/06_MATCH_ENGINE.md §2):
 *   - Ganar con gamesPerSet y al menos 2 de diferencia (ej. 6-2, 6-4), sin tiebreak.
 *   - Ganar gamesPerSet+1 a gamesPerSet-1 (ej. 7-5), sin tiebreak.
 *   - Ganar gamesPerSet+1 a gamesPerSet (ej. 7-6) — SIEMPRE requiere un
 *     resultado de tiebreak válido registrado.
 * Cualquier otro marcador (6-5, 8-6, 6-6 sin tiebreak, etc.) es inválido.
 */
export function validateRegularSet(
  set: SetScoreInput,
  config: ScoringConfig
): SetValidationResult {
  const { teamAGames, teamBGames, tiebreakA, tiebreakB } = set;

  if (!isNonNegInt(teamAGames) || !isNonNegInt(teamBGames)) {
    return invalid("los games deben ser enteros no negativos");
  }
  if (teamAGames === teamBGames) {
    return invalid("un set no puede terminar en empate de games");
  }

  const winnerIsA = teamAGames > teamBGames;
  const winnerGames = Math.max(teamAGames, teamBGames);
  const loserGames = Math.min(teamAGames, teamBGames);
  const hasTiebreak = tiebreakA != null && tiebreakB != null;

  const isCleanWin = winnerGames === config.gamesPerSet && winnerGames - loserGames >= 2;
  const isAdvantageWin =
    winnerGames === config.gamesPerSet + 1 && loserGames === config.gamesPerSet - 1;
  const isTiebreakShape =
    winnerGames === config.gamesPerSet + 1 && loserGames === config.gamesPerSet;

  if (isCleanWin || isAdvantageWin) {
    if (hasTiebreak) {
      return invalid(
        `el set ${winnerGames}-${loserGames} no debía resolverse por tiebreak, pero trae un resultado de tiebreak registrado`
      );
    }
    return { valid: true, winner: winnerIsA ? "A" : "B" };
  }

  if (isTiebreakShape) {
    if (!hasTiebreak) {
      return invalid(
        `el set ${winnerGames}-${loserGames} requiere un resultado de tiebreak registrado`
      );
    }
    const tbResult = validateTiebreakScore(tiebreakA!, tiebreakB!, config.tiebreakPoints);
    if (!tbResult.valid) return tbResult;
    // El ganador del set es quien ganó los games (7), el tiebreak solo decide el 7-6 —
    // deben ser consistentes entre sí.
    if (tbResult.winner !== (winnerIsA ? "A" : "B")) {
      return invalid("el ganador del tiebreak no coincide con el ganador de games del set");
    }
    return { valid: true, winner: winnerIsA ? "A" : "B" };
  }

  return invalid(
    `marcador de set inválido: ${teamAGames}-${teamBGames} (gamesPerSet=${config.gamesPerSet})`
  );
}

/**
 * Valida un set jugado como super tiebreak (set decisivo, docs §2 —
 * "Tie-break normal vs. super tie-break... en el último set"). Convención:
 * el "set" se registra igual (teamAGames/teamBGames = 1-0 simbólico para
 * el ganador), pero el resultado real vive en tiebreakA/tiebreakB.
 */
export function validateSuperTiebreakSet(
  set: SetScoreInput,
  config: ScoringConfig
): SetValidationResult {
  if (set.tiebreakA == null || set.tiebreakB == null) {
    return invalid("el set decisivo por super tiebreak requiere el resultado del tiebreak");
  }
  const result = validateTiebreakScore(set.tiebreakA, set.tiebreakB, config.superTiebreakPoints);
  if (!result.valid) return result;

  const expectedWinnerIsA = result.winner === "A";
  if ((set.teamAGames > set.teamBGames) !== expectedWinnerIsA) {
    return invalid("el ganador simbólico del set (teamAGames/teamBGames) no coincide con el super tiebreak");
  }
  return result;
}
