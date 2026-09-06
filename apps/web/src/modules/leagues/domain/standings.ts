import type { GroupStanding } from "@padel-platform/tournament-engine";

/** Un resultado por jornada, en orden cronológico — 'W'/'L' de los últimos partidos confirmados del equipo, para la racha de forma. */
export type FormResult = "W" | "L";

export interface LeagueStandingsEntry extends GroupStanding {
  teamLabel: string;
  /** Últimos resultados confirmados en orden cronológico (más reciente al final) — se recorta a 5 en la UI. */
  form: FormResult[];
}
