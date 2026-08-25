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
  isPaused: boolean;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  actualStart: string | null;
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

/** Nombres cortos para la fila del marcador — .sb-name en padel-platform.html usa solo el primer nombre de cada jugador. */
export function matchTeamShortLabel(team: MatchTeamView | null): string {
  if (!team) return "Por definir";
  return team.players.map((p) => p.firstName).join(" / ");
}

/**
 * Estado "visual" de un partido — colapsa status+isPaused en el mismo set de
 * 6 estados que padel-platform.html (.match-card.live/paused/cancelled/
 * disputed, mc-badge.b-*): IN_PROGRESS con isPaused=true se ve y filtra como
 * "paused", nunca como "live". PENDING_CONFIRMATION y CONFIRMED caen ambos en
 * "done" — esta pantalla es de gestión en vivo, no de historial.
 */
export type MatchDisplayStatus = "LIVE" | "UPCOMING" | "PAUSED" | "CANCELLED" | "DISPUTED" | "DONE";

export function matchDisplayStatus(match: Pick<MatchListItem, "status" | "isPaused">): MatchDisplayStatus {
  if (match.status === "IN_PROGRESS") return match.isPaused ? "PAUSED" : "LIVE";
  if (match.status === "SCHEDULED") return "UPCOMING";
  if (match.status === "CANCELLED") return "CANCELLED";
  if (match.status === "DISPUTED") return "DISPUTED";
  return "DONE";
}

export const MATCH_DISPLAY_STATUS_META: Record<MatchDisplayStatus, { label: string; tone: "accent" | "neutral" | "pause" | "cancel"; pulse: boolean }> = {
  LIVE: { label: "En vivo", tone: "accent", pulse: true },
  UPCOMING: { label: "Próximo", tone: "neutral", pulse: false },
  PAUSED: { label: "Pausado", tone: "pause", pulse: false },
  CANCELLED: { label: "Cancelado", tone: "cancel", pulse: false },
  DISPUTED: { label: "Disputado", tone: "cancel", pulse: false },
  DONE: { label: "Confirmado", tone: "neutral", pulse: false },
};

/** Orden de la grilla — igual criterio que renderGrid() en el mockup. */
export const MATCH_DISPLAY_STATUS_ORDER: Record<MatchDisplayStatus, number> = {
  LIVE: 0,
  DISPUTED: 1,
  PAUSED: 2,
  UPCOMING: 3,
  DONE: 4,
  CANCELLED: 5,
};
