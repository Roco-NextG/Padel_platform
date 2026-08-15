import { BracketResult, GroupId, TeamId } from "./types";

export interface BracketMatchSlot {
  /** posición del partido dentro de la ronda, 0-indexada */
  matchIndex: number;
  teamAId: TeamId | null;
  teamBId: TeamId | null;
  isByeMatch: boolean;
  autoAdvanceTeamId: TeamId | null;
}

export interface BracketRound {
  /** 1 = primera ronda; el número más alto es la final */
  roundNumber: number;
  matches: BracketMatchSlot[];
}

/**
 * Construye la estructura completa del cuadro (todas las rondas, no solo la
 * primera) a partir del resultado de `generateBracket`. La ronda 1 sale
 * directa de `firstRoundMatches`; el resto arrancan vacías y se rellenan a
 * medida que se confirman partidos (`advanceBracket`) — salvo los byes de
 * la ronda 1, que se propagan de inmediato porque no hay partido que jugar
 * (docs/04_TOURNAMENT_ENGINE.md §8: "se genera automáticamente el/los Match
 * de la siguiente ronda... dejando team_a/team_b pendiente hasta que ambos
 * lados del cruce estén confirmados").
 */
export function initializeBracketRounds(bracket: BracketResult): BracketRound[] {
  const totalRounds = Math.log2(bracket.bracketSize);
  if (!Number.isInteger(totalRounds)) {
    throw new Error("bracket.bracketSize debe ser una potencia de 2");
  }

  const rounds: BracketRound[] = [
    {
      roundNumber: 1,
      matches: bracket.firstRoundMatches.map((m) => ({
        matchIndex: m.position,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        isByeMatch: m.isByeMatch,
        autoAdvanceTeamId: m.autoAdvanceTeamId,
      })),
    },
  ];

  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = bracket.bracketSize / Math.pow(2, round);
    rounds.push({
      roundNumber: round,
      matches: Array.from({ length: matchesInRound }, (_, i) => ({
        matchIndex: i,
        teamAId: null,
        teamBId: null,
        isByeMatch: false,
        autoAdvanceTeamId: null,
      })),
    });
  }

  // Propagar de inmediato los byes de la ronda 1 — no requieren que se
  // confirme ningún partido.
  for (const m of rounds[0].matches) {
    if (m.isByeMatch && m.autoAdvanceTeamId) {
      placeWinnerInNextRound(rounds, 1, m.matchIndex, m.autoAdvanceTeamId);
    }
  }

  return rounds;
}

/**
 * El partido en la posición `matchIndex` de la ronda `fromRound` alimenta
 * siempre el partido `floor(matchIndex / 2)` de la ronda siguiente, como
 * teamA si matchIndex es par, como teamB si es impar — es la misma
 * estructura recursiva que ya usa `generateSeedOrder`/`earliestPossibleRound`
 * en bracket.ts, aplicada ronda a ronda en vez de en el cálculo inicial.
 */
function placeWinnerInNextRound(
  rounds: BracketRound[],
  fromRound: number,
  fromMatchIndex: number,
  winnerTeamId: TeamId
): void {
  const nextRound = rounds.find((r) => r.roundNumber === fromRound + 1);
  if (!nextRound) return; // fromRound era la final, no hay ronda siguiente

  const nextMatchIndex = Math.floor(fromMatchIndex / 2);
  const nextMatch = nextRound.matches[nextMatchIndex];
  if (fromMatchIndex % 2 === 0) {
    nextMatch.teamAId = winnerTeamId;
  } else {
    nextMatch.teamBId = winnerTeamId;
  }
}

/**
 * Avanza el cuadro tras confirmarse un partido: coloca al ganador en su
 * casilla de la siguiente ronda. Devuelve una copia — nunca muta `rounds`
 * en el lugar, para que el caller decida cuándo persistir el nuevo estado.
 */
export function advanceBracket(
  rounds: BracketRound[],
  completed: { round: number; matchIndex: number; winnerTeamId: TeamId }
): BracketRound[] {
  const cloned = rounds.map((r) => ({
    roundNumber: r.roundNumber,
    matches: r.matches.map((m) => ({ ...m })),
  }));
  placeWinnerInNextRound(cloned, completed.round, completed.matchIndex, completed.winnerTeamId);
  return cloned;
}

/** Un partido está listo para jugarse/programarse cuando tiene ambos equipos asignados. */
export function isMatchReady(round: BracketRound, matchIndex: number): boolean {
  const m = round.matches[matchIndex];
  return m != null && m.teamAId != null && m.teamBId != null;
}

/**
 * true si la ronda es la final (no tiene ronda siguiente en `rounds`) —
 * útil para que el caller sepa cuándo el ganador de un partido es el
 * campeón del torneo en vez de "avanzar" a ningún lado.
 */
export function isFinalRound(rounds: BracketRound[], roundNumber: number): boolean {
  return !rounds.some((r) => r.roundNumber === roundNumber + 1);
}
