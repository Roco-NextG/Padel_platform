import type { PhaseType } from "@/lib/supabase/database.types";

/**
 * Cuántos equipos de cada grupo avanzan al cuadro de eliminación. Fuente
 * única — antes vivía solo como constante de UI en group-standings.tsx (la
 * etiqueta "CLASIFICA"), pero nunca se aplicaba al armar el bracket: el
 * pipeline pasaba TODOS los equipos de cada grupo a balancedSeeding, no
 * solo los clasificados. 04_TOURNAMENT_ENGINE.md §4.1 asume que la lista
 * global de fortaleza se construye a partir de "los clasificados" —
 * bracketRepository.ts ahora recorta acá antes de sembrar.
 */
export const QUALIFYING_SLOTS_PER_GROUP = 2;

/**
 * Una fila de la tabla global de fortaleza (04_TOURNAMENT_ENGINE.md §4.1) —
 * TODOS los clasificados de TODOS los grupos, en el mismo orden exacto que
 * usa balancedSeeding() para sembrar el cuadro. `seed` es ese mismo número:
 * si el organizador ya generó el cuadro, la posición 1 de esta tabla es
 * literalmente el seed 1 del bracket.
 */
export interface GlobalStandingsEntry {
  teamId: string;
  teamLabel: string;
  groupName: string;
  seed: number;
  matchesWon: number;
  gamesWon: number;
  gamesLost: number;
  setDiff: number;
  gameDiff: number;
  requiresManualResolution: boolean;
}

/** roundNumber: 1 = primera ronda, totalRounds = final. */
export function phaseTypeForRound(roundNumber: number, totalRounds: number): PhaseType {
  const distanceFromFinal = totalRounds - roundNumber;
  switch (distanceFromFinal) {
    case 0:
      return "FINAL";
    case 1:
      return "SEMIFINAL";
    case 2:
      return "QUARTERFINAL";
    case 3:
      return "ROUND_OF_16";
    default:
      return "ROUND_OF_32";
  }
}

const PHASE_LABELS: Record<PhaseType, string> = {
  GROUPS: "Fase de grupos",
  ROUND_OF_32: "Dieciseisavos",
  ROUND_OF_16: "Octavos",
  QUARTERFINAL: "Cuartos de final",
  SEMIFINAL: "Semifinal",
  FINAL: "Final",
  CONSOLATION: "Consolación",
};

export function phaseLabel(type: PhaseType): string {
  return PHASE_LABELS[type];
}

export interface BracketTeamInfo {
  teamId: string;
  players: { firstName: string; lastName: string }[];
  seed: number | null;
}

export interface BracketMatchView {
  matchId: string | null;
  roundIndex: number;
  teamA: BracketTeamInfo | null;
  teamB: BracketTeamInfo | null;
  winnerTeamId: string | null;
  status: string | null;
  isBye: boolean;
}

export interface BracketRoundView {
  phaseId: string;
  type: PhaseType;
  orderIndex: number;
  matches: BracketMatchView[];
}
