import type { PhaseType } from "@/lib/supabase/database.types";

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
