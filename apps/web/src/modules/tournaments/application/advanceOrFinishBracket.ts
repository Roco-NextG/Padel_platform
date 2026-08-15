import { advanceBracket, isFinalRound, isMatchReady } from "@padel-platform/tournament-engine";
import type { BracketMatchSlot, BracketRound } from "@padel-platform/tournament-engine";
import { siblingMatchIndex } from "../domain/bracket";
import {
  createBracketMatchRpc,
  fetchConfirmedMatchAtSlot,
  fetchMatchBracketContext,
  fetchPhase,
  fetchPhasesForCategory,
  finishTournamentRpc,
} from "../infrastructure/tournamentRepository";

/**
 * Avance de cuadro al confirmar un partido (docs/04_TOURNAMENT_ENGINE.md §8).
 * Pensado para llamarse sin gate previo tras CUALQUIER Match que pase a
 * CONFIRMED (igual que recordRatingEventsForMatch) — un partido sin fase,
 * o de fase GROUPS, simplemente no hace nada (fase de grupos fuera de
 * alcance de este prompt).
 * Reconstruye únicamente el estado mínimo que advanceBracket/isMatchReady
 * necesitan: el lado hermano del cruce (round_index XOR 1 dentro de la misma
 * fase) puede estar sin jugar todavía, ya resuelto por un bye (persistido
 * como CONFIRMED en la generación), o ya confirmado por un partido real —
 * en los tres casos la única fuente de verdad es la fila `matches` de ese
 * hermano, nunca un estado intermedio propio, porque nunca se persiste un
 * Match con un solo lado resuelto (ver generateBracketForCategory).
 *
 * No reimplementa la colocación del ganador: llama a las funciones puras
 * reales de @padel-platform/tournament-engine con un `BracketRound[]`
 * mínimo pero fiel (rondas reales de la categoría + el estado real del
 * cruce siguiente).
 */
export async function advanceOrFinishBracket(matchId: string): Promise<void> {
  const match = await fetchMatchBracketContext(matchId);
  if (!match || !match.phaseId || match.roundIndex == null) return;
  if (match.status !== "CONFIRMED" || !match.winnerTeamId) return;

  const phase = await fetchPhase(match.phaseId);
  if (!phase || phase.type === "GROUPS") return;

  const phases = await fetchPhasesForCategory(phase.category_id);
  const roundsForFinalCheck: BracketRound[] = phases.map((p) => ({
    roundNumber: p.order_index,
    matches: [],
  }));

  if (isFinalRound(roundsForFinalCheck, phase.order_index)) {
    if (!match.tournamentId) throw new Error(`El partido ${matchId} no tiene tournament_id.`);
    await finishTournamentRpc({ tournamentId: match.tournamentId, completedMatchId: matchId });
    return;
  }

  const nextPhase = phases.find((p) => p.order_index === phase.order_index + 1);
  if (!nextPhase) return;

  const nextMatchIndex = Math.floor(match.roundIndex / 2);
  const siblingIndex = siblingMatchIndex(match.roundIndex);
  const sibling = await fetchConfirmedMatchAtSlot(match.phaseId, siblingIndex);
  const siblingWinnerId =
    sibling && sibling.status === "CONFIRMED" ? sibling.winnerTeamId : null;

  const matchesInNextRound: BracketMatchSlot[] = new Array(Math.max(nextMatchIndex + 1, 1))
    .fill(null)
    .map((_, i) => ({
      matchIndex: i,
      teamAId: null,
      teamBId: null,
      isByeMatch: false,
      autoAdvanceTeamId: null,
    }));
  if (siblingWinnerId) {
    const targetSlot = matchesInNextRound[nextMatchIndex];
    if (match.roundIndex % 2 === 0) targetSlot.teamBId = siblingWinnerId;
    else targetSlot.teamAId = siblingWinnerId;
  }

  const rounds: BracketRound[] = [
    { roundNumber: phase.order_index, matches: [] },
    { roundNumber: nextPhase.order_index, matches: matchesInNextRound },
  ];

  const advanced = advanceBracket(rounds, {
    round: phase.order_index,
    matchIndex: match.roundIndex,
    winnerTeamId: match.winnerTeamId,
  });
  const nextRound = advanced.find((r) => r.roundNumber === nextPhase.order_index)!;

  if (!isMatchReady(nextRound, nextMatchIndex)) return;

  const slot = nextRound.matches[nextMatchIndex];
  if (!match.tournamentId) throw new Error(`El partido ${matchId} no tiene tournament_id.`);
  await createBracketMatchRpc({
    tournamentId: match.tournamentId,
    phaseId: nextPhase.id,
    roundIndex: nextMatchIndex,
    teamAId: slot.teamAId!,
    teamBId: slot.teamBId!,
    matchType: "TOURNAMENT",
    completedMatchId: matchId,
  });
}
