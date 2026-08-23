import { CourtId, MatchId, MatchStatus } from "./types";

/**
 * Transiciones válidas (docs/06_MATCH_ENGINE.md §6). El organizador puede
 * saltar directo a CONFIRMED desde SCHEDULED/IN_PROGRESS (registro directo,
 * §3 nota de alcance MVP) sin pasar por PENDING_CONFIRMATION. DISPUTED solo
 * lo resuelve un admin — quién puede hacer la transición es autorización,
 * no algo que valide esta máquina de estados pura.
 */
const ALLOWED_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  SCHEDULED: ["IN_PROGRESS", "CANCELLED", "CONFIRMED"],
  IN_PROGRESS: ["PENDING_CONFIRMATION", "CONFIRMED", "CANCELLED"],
  PENDING_CONFIRMATION: ["CONFIRMED", "DISPUTED", "CANCELLED"],
  DISPUTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: [],
  CANCELLED: [],
};

export function canTransition(from: MatchStatus, to: MatchStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface CourtMatch {
  matchId: MatchId;
  courtId: CourtId;
  status: MatchStatus;
}

export interface CourtConflict {
  courtId: CourtId;
  matchIds: MatchId[];
}

/**
 * Dos partidos IN_PROGRESS a la vez en la misma pista del mismo club es una
 * ADVERTENCIA al organizador, nunca un bloqueo duro (docs/06_MATCH_ENGINE.md
 * §5 — puede haber overrides legítimos por retrasos).
 */
export function detectCourtConflicts(matches: CourtMatch[]): CourtConflict[] {
  const byCourt = new Map<CourtId, MatchId[]>();
  for (const m of matches) {
    if (m.status !== "IN_PROGRESS") continue;
    const list = byCourt.get(m.courtId) ?? [];
    list.push(m.matchId);
    byCourt.set(m.courtId, list);
  }
  return [...byCourt.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([courtId, matchIds]) => ({ courtId, matchIds }));
}
