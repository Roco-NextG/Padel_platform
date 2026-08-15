import type { SeededTeam } from "@padel-platform/tournament-engine";
import type { PhaseType } from "@/lib/supabase/database.types";

/**
 * PhaseType (0001_schema.sql) solo define nombres hasta ROUND_OF_32 — un
 * cuadro directo de más de 32 equipos no tiene representación hoy. Índice 0
 * = la final (distancia 0), índice 1 = semifinal, etc., el mismo criterio
 * que ya usa bracketProgression.ts (roundNumber más alto = más cerca de la
 * final) pero leído desde el otro extremo.
 */
const PHASE_TYPES_BY_DISTANCE_FROM_FINAL: PhaseType[] = [
  "FINAL",
  "SEMIFINAL",
  "QUARTERFINAL",
  "ROUND_OF_16",
  "ROUND_OF_32",
];

export function phaseTypeForRound(roundNumber: number, totalRounds: number): PhaseType {
  const distanceFromFinal = totalRounds - roundNumber;
  const type = PHASE_TYPES_BY_DISTANCE_FROM_FINAL[distanceFromFinal];
  if (!type) {
    throw new Error(
      `No hay PhaseType definido para un cuadro de ${totalRounds} rondas (ronda ${roundNumber}); ` +
        "el máximo soportado hoy es ROUND_OF_32 (32 equipos)."
    );
  }
  return type;
}

/** PRNG simple y determinista, mismo algoritmo que groupStage.ts usa internamente para desempatar sin seed manual. */
function deterministicOrder(teamId: string, seed = 42): number {
  let hash = seed;
  for (let i = 0; i < teamId.length; i++) {
    hash = (hash * 31 + teamId.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * seed = Team.seed si el organizador ya sembró manualmente TODOS los
 * equipos inscritos; si falta aunque sea uno, se descarta el seeding
 * parcial (ambiguo) y se usa orden aleatorio determinista para todos, para
 * no mezclar equipos "fuertes a propósito" con equipos "fuertes por
 * casualidad de no tener seed todavía".
 */
export function buildSeededTeams(
  teams: { teamId: string; organizerSeed: number | null }[]
): SeededTeam[] {
  const allManuallySeeded = teams.length > 0 && teams.every((t) => t.organizerSeed != null);
  const ordered = allManuallySeeded
    ? [...teams].sort((a, b) => a.organizerSeed! - b.organizerSeed!)
    : [...teams].sort((a, b) => deterministicOrder(a.teamId) - deterministicOrder(b.teamId));
  return ordered.map((t, index) => ({ teamId: t.teamId, seed: index + 1 }));
}

/** El partido en `matchIndex` de una ronda siempre se empareja con matchIndex XOR 1 (par<->impar consecutivo). */
export function siblingMatchIndex(matchIndex: number): number {
  return matchIndex % 2 === 0 ? matchIndex + 1 : matchIndex - 1;
}

const PHASE_TYPE_LABELS: Record<PhaseType, string> = {
  GROUPS: "Fase de grupos",
  ROUND_OF_32: "Dieciseisavos",
  ROUND_OF_16: "Octavos",
  QUARTERFINAL: "Cuartos de final",
  SEMIFINAL: "Semifinal",
  FINAL: "Final",
  CONSOLATION: "Consolación",
};

export function phaseTypeLabel(type: PhaseType): string {
  return PHASE_TYPE_LABELS[type];
}
