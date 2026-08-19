import { z } from "zod";
import { DEFAULT_SCORING_CONFIG, type ScoringConfig } from "@padel-platform/match-engine";
import type { ScoringConfigJson } from "@/lib/supabase/database.types";

/** `{}` (tournament hasn't configured scoring yet) falls back to the engine's own defaults, field by field. */
export function parseScoringConfig(raw: ScoringConfigJson | null | undefined): ScoringConfig {
  return { ...DEFAULT_SCORING_CONFIG, ...(raw ?? {}) };
}

const setInputSchema = z.object({
  setNumber: z.number().int().positive(),
  teamAGames: z.number().int().min(0),
  teamBGames: z.number().int().min(0),
  tiebreakA: z.number().int().min(0).nullable().optional(),
  tiebreakB: z.number().int().min(0).nullable().optional(),
});

export const matchResultSubmissionSchema = z.object({
  sets: z.array(setInputSchema).min(1, "Registra al menos un set."),
  winner: z.enum(["A", "B"]),
});

export type MatchResultSubmissionInput = z.infer<typeof matchResultSubmissionSchema>;

export interface MatchParticipant {
  playerId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}

export interface MatchTeam {
  teamId: string;
  players: MatchParticipant[];
}

export interface MatchSetDisplay {
  setNumber: number;
  teamAGames: number;
  teamBGames: number;
  tiebreakA: number | null;
  tiebreakB: number | null;
}

export interface MatchWithContext {
  id: string;
  status: string;
  matchType: string;
  tournamentId: string | null;
  tournamentName: string | null;
  clubId: string | null;
  courtId: string | null;
  scheduledStart: string | null;
  scoringConfig: ScoringConfig;
  teamA: MatchTeam;
  teamB: MatchTeam;
  winnerTeamId: string | null;
  sets: MatchSetDisplay[];
  isPaused: boolean;
}

export interface MatchConfirmationState {
  playerId: string;
  confirmed: boolean | null;
}

/**
 * Regla de "quién va ganando" para el resaltado en vivo mientras se carga un
 * set (redesign/partidos-vivo §3) — la misma condición de victoria de set
 * que usa validateRegularSet en @padel-platform/match-engine (6+ con
 * diferencia de 2, o 7 por tie-break), pero simplificada a games fijos en
 * vez de leer ScoringConfig: es un heurístico puramente visual sobre un set
 * a medio cargar, nunca la validación real — esa sigue siendo
 * validateMatchResult, sin cambios, cuando el resultado se envía.
 */
export function estimateSetWinner(teamAGames: number, teamBGames: number): "A" | "B" | null {
  if (teamAGames === 7 && teamBGames <= 6) return "A";
  if (teamBGames === 7 && teamAGames <= 6) return "B";
  if (teamAGames >= 6 && teamAGames - teamBGames >= 2) return "A";
  if (teamBGames >= 6 && teamBGames - teamAGames >= 2) return "B";
  return null;
}

/** Un set "terminó por tie-break" cuando el marcador de games quedó 7-6 — el indicador visual (superíndice "TB") se calcula solo a partir de esto, nunca de si tiebreakA/B vienen cargados. */
export function isSetTiebreak(teamAGames: number, teamBGames: number): boolean {
  return (teamAGames === 7 && teamBGames === 6) || (teamBGames === 7 && teamAGames === 6);
}
