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
  scoringConfig: ScoringConfig;
  teamA: MatchTeam;
  teamB: MatchTeam;
  winnerTeamId: string | null;
  sets: MatchSetDisplay[];
}

export interface MatchConfirmationState {
  playerId: string;
  confirmed: boolean | null;
}
