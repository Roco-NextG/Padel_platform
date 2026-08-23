import { validateRegularSet, validateSuperTiebreakSet } from "./scoreValidation";
import { MatchValidationResult, ScoringConfig, SetScoreInput, TeamSide } from "./types";

/**
 * Valida un partido completo (docs/06_MATCH_ENGINE.md §2, reglas duras):
 *   - No se puede confirmar sin al menos un SetScore válido por cada set jugado.
 *   - Cada set debe validar individualmente contra scoring_config.
 *   - El ganador del partido debe ser matemáticamente consistente con los
 *     sets registrados (ej. mejor de 3: el ganador tiene 2 sets ganados).
 *   - No pueden existir sets adicionales después de que el partido ya
 *     estaba decidido.
 */
export function validateMatchResult(
  sets: SetScoreInput[],
  config: ScoringConfig,
  claimedWinner: TeamSide
): MatchValidationResult {
  if (sets.length === 0) {
    return { valid: false, errors: ["no se puede confirmar un partido sin al menos un set registrado"] };
  }

  const sorted = [...sets].sort((a, b) => a.setNumber - b.setNumber);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].setNumber !== i + 1) {
      return {
        valid: false,
        errors: [`falta el set número ${i + 1}, o los números de set no son consecutivos`],
      };
    }
  }

  const maxPossibleSets = config.setsToWin * 2 - 1;
  const decidingSetIndex = maxPossibleSets - 1; // 0-based

  const errors: string[] = [];
  let setsWonA = 0;
  let setsWonB = 0;
  let decidedAtIndex: number | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const set = sorted[i];
    const isSuperTiebreakSet = config.finalSetMode === "SUPER_TIEBREAK" && i === decidingSetIndex;
    const result = isSuperTiebreakSet
      ? validateSuperTiebreakSet(set, config)
      : validateRegularSet(set, config);

    if (!result.valid) {
      errors.push(`set ${set.setNumber}: ${result.reason}`);
      continue;
    }

    if (result.winner === "A") setsWonA++;
    else setsWonB++;

    if (decidedAtIndex === null && (setsWonA === config.setsToWin || setsWonB === config.setsToWin)) {
      decidedAtIndex = i;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  if (decidedAtIndex !== null && decidedAtIndex < sorted.length - 1) {
    return {
      valid: false,
      errors: [
        `el partido ya estaba decidido en el set ${sorted[decidedAtIndex].setNumber}; no deberían existir sets posteriores`,
      ],
    };
  }

  if (setsWonA !== config.setsToWin && setsWonB !== config.setsToWin) {
    return {
      valid: false,
      errors: [`ningún equipo alcanzó los ${config.setsToWin} sets necesarios para ganar el partido`],
    };
  }

  const computedWinner: TeamSide = setsWonA === config.setsToWin ? "A" : "B";
  if (computedWinner !== claimedWinner) {
    return {
      valid: false,
      errors: [
        `el ganador declarado (${claimedWinner}) no es consistente con los sets registrados (resultado real: ${computedWinner})`,
      ],
    };
  }

  return { valid: true, winner: computedWinner, errors: [] };
}
