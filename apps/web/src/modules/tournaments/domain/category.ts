import type { GenderType } from "@/lib/supabase/database.types";

export interface TournamentCategory {
  id: string;
  tournamentId: string;
  name: string;
  level: string;
  genderRestriction: GenderType;
  usesGroupStage: boolean;
}

export const CATEGORY_LEVELS = [1, 2, 3, 4, 5, 6, 7] as const;

/** MALE/FEMALE/MIXED son las únicas que tienen sentido como restricción de categoría — OTHER queda para el género del jugador individual, no para "de qué categoría es esta pareja". */
export const CATEGORY_GENDERS: { code: "MALE" | "FEMALE" | "MIXED"; label: string; short: string }[] = [
  { code: "MALE", label: "Masculina", short: "M" },
  { code: "FEMALE", label: "Femenina", short: "F" },
  { code: "MIXED", label: "Mixta", short: "X" },
];

const LEVEL_ORDINAL: Record<number, string> = {
  1: "1ra",
  2: "2da",
  3: "3ra",
  4: "4ta",
  5: "5ta",
  6: "6ta",
  7: "7ma",
};

export function categoryName(level: number, gender: "MALE" | "FEMALE" | "MIXED"): string {
  const genderLabel = CATEGORY_GENDERS.find((g) => g.code === gender)?.label ?? gender;
  return gender === "MIXED" ? `Mixta ${LEVEL_ORDINAL[level]}` : `${LEVEL_ORDINAL[level]} ${genderLabel}`;
}
