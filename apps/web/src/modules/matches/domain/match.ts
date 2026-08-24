import { DEFAULT_SCORING_CONFIG, type ScoringConfig, type SetScoreInput } from "@padel-platform/match-engine";
import type { ScoringConfigJson, MatchStatus } from "@/lib/supabase/database.types";

export type { ScoringConfig, SetScoreInput };
export { DEFAULT_SCORING_CONFIG };

/** El torneo guarda solo lo que se desvía del default (0009: scoring_config jsonb default '{}') — acá se completa lo que falte. */
export function resolveScoringConfig(json: ScoringConfigJson): ScoringConfig {
  return { ...DEFAULT_SCORING_CONFIG, ...json };
}

export interface MatchPlayer {
  playerId: string;
  firstName: string;
  lastName: string;
}

export interface MatchTeamView {
  teamId: string;
  players: MatchPlayer[];
}

export interface MatchListItem {
  id: string;
  tournamentId: string;
  tournamentName: string;
  categoryName: string;
  phaseLabel: string;
  groupName: string | null;
  courtId: string | null;
  courtName: string | null;
  status: MatchStatus;
  scheduledStart: string | null;
  teamA: MatchTeamView | null;
  teamB: MatchTeamView | null;
  winnerTeamId: string | null;
  scoringConfig: ScoringConfig;
}

const STATUS_LABELS: Record<MatchStatus, string> = {
  SCHEDULED: "Programado",
  IN_PROGRESS: "En juego",
  PENDING_CONFIRMATION: "Por confirmar",
  CONFIRMED: "Confirmado",
  DISPUTED: "En disputa",
  CANCELLED: "Cancelado",
};

export function matchStatusLabel(status: MatchStatus): string {
  return STATUS_LABELS[status];
}

export function matchTeamLabel(team: MatchTeamView | null): string {
  if (!team) return "Por definir";
  return team.players.map((p) => `${p.firstName} ${p.lastName}`.trim()).join(" / ");
}
