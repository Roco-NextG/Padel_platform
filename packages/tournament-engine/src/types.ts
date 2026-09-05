export type TeamId = string;
export type GroupId = string;

export interface Team {
  id: TeamId;
  groupId?: GroupId | null;
}

/** Resultado agregado de un partido, ya validado por el Match Engine. */
export interface MatchResult {
  teamAId: TeamId;
  teamBId: TeamId;
  winnerId: TeamId;
  setsWonA: number;
  setsWonB: number;
  gamesWonA: number;
  gamesWonB: number;
}

export interface GroupStanding {
  teamId: TeamId;
  matchesPlayed: number;
  matchesWon: number;
  gamesWon: number;
  gamesLost: number;
  setsWon: number;
  setsLost: number;
  setDiff: number;
  gameDiff: number;
  /** true si este equipo quedó en empate exacto tras los 4 criterios y requiere resolución manual del organizador */
  requiresManualResolution: boolean;
}

/** Un equipo ya posicionado con su fortaleza relativa, listo para entrar al bracket. */
export interface SeededTeam {
  teamId: TeamId;
  groupId?: GroupId | null;
  /** 1 = más fuerte */
  seed: number;
  /** true si este equipo quedó en empate exacto en la lista global de fortaleza (04_TOURNAMENT_ENGINE.md §4.1) y requiere resolución manual del organizador */
  requiresManualResolution?: boolean;
}

export interface BracketSlot {
  /** posición 0-indexada dentro del cuadro (bracketSize posiciones) */
  position: number;
  /** seed asignado a esta posición; puede ser > N si es un BYE */
  seed: number;
  teamId: TeamId | null;
  isBye: boolean;
}

export interface FirstRoundMatch {
  position: number; // posición del match dentro de la ronda 1 (0-indexada)
  teamAId: TeamId | null;
  teamBId: TeamId | null;
  /** true si uno de los dos lados es BYE: el equipo avanza automáticamente, no se juega */
  isByeMatch: boolean;
  /** equipo que avanza directamente si isByeMatch = true */
  autoAdvanceTeamId: TeamId | null;
}

export interface GroupConflict {
  teamAId: TeamId;
  teamBId: TeamId;
  groupId: GroupId;
  /** ronda (1 = primera ronda, más alto = rondas posteriores) en la que matemáticamente podrían cruzarse */
  earliestPossibleRound: number;
}

export interface BracketResult {
  bracketSize: number;
  byes: number;
  slots: BracketSlot[];
  firstRoundMatches: FirstRoundMatch[];
  /** pares del mismo grupo que el motor no pudo separar; se muestran al organizador, no bloquean la generación */
  unresolvedGroupConflicts: GroupConflict[];
}
