import { MatchStatus, PlayerId, ResultSubmission, SetScoreInput } from "./types";

/**
 * Normaliza un resultado para comparar dos registros del "mismo" partido
 * sin que el orden de envío de los sets importe.
 */
function normalize(sets: SetScoreInput[], claimedWinner: string): string {
  const sorted = [...sets].sort((a, b) => a.setNumber - b.setNumber);
  return JSON.stringify({
    winner: claimedWinner,
    sets: sorted.map((s) => ({
      n: s.setNumber,
      a: s.teamAGames,
      b: s.teamBGames,
      tbA: s.tiebreakA ?? null,
      tbB: s.tiebreakB ?? null,
    })),
  });
}

/**
 * Detecta discrepancia entre múltiples registros del mismo partido
 * (docs/06_MATCH_ENGINE.md §3 — "si un jugador registra un resultado
 * distinto al ya registrado por otro... Match.status = DISPUTED").
 */
export function detectDiscrepancy(
  submissions: ResultSubmission[]
): { hasDiscrepancy: boolean; reason?: string } {
  if (submissions.length <= 1) return { hasDiscrepancy: false };

  const first = normalize(submissions[0].sets, submissions[0].claimedWinner);
  for (const s of submissions.slice(1)) {
    if (normalize(s.sets, s.claimedWinner) !== first) {
      return {
        hasDiscrepancy: true,
        reason: "los resultados registrados por distintos jugadores no coinciden",
      };
    }
  }
  return { hasDiscrepancy: false };
}

export interface PlayerConfirmation {
  playerId: PlayerId;
  /** null = todavía no respondió. true = confirmó. false = rechazó explícitamente. */
  confirmed: boolean | null;
}

/**
 * Estado agregado del partido a partir de las confirmaciones individuales
 * (docs/06_MATCH_ENGINE.md §3 y §7 — confirmación parcial permanece
 * PENDING_CONFIRMATION; cualquier rechazo explícito dispara DISPUTED).
 */
export function computeConfirmationStatus(
  confirmations: PlayerConfirmation[]
): Extract<MatchStatus, "PENDING_CONFIRMATION" | "CONFIRMED" | "DISPUTED"> {
  if (confirmations.some((c) => c.confirmed === false)) {
    return "DISPUTED";
  }
  if (confirmations.length > 0 && confirmations.every((c) => c.confirmed === true)) {
    return "CONFIRMED";
  }
  return "PENDING_CONFIRMATION";
}
