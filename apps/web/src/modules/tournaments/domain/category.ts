import type { GenderType } from "@/lib/supabase/database.types";

export interface TournamentCategory {
  id: string;
  tournamentId: string;
  name: string;
  level: string;
  /** null solo en Junior (0 pedido explícito: "no importa el género") — nunca en las categorías por nivel. */
  genderRestriction: GenderType | null;
  usesGroupStage: boolean;
  minAge: number | null;
  maxAge: number | null;
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

/**
 * Categorías por edad (pedido explícito) — un eje totalmente distinto al de
 * nivel de juego (1ra..7ma): no tienen "level" numérico, así que reusan la
 * misma columna `level` (texto libre) guardando "MASTER"/"JUNIOR" en vez de
 * un número. Master se divide en masculino/femenino; Junior no restringe
 * género ("no importa el género" — genderRestriction null, no MIXED, ver
 * nota en la migración 0034).
 */
export type AgeCategoryKey = "MASTER_MALE" | "MASTER_FEMALE" | "JUNIOR";

export const AGE_CATEGORIES: {
  key: AgeCategoryKey;
  level: "MASTER" | "JUNIOR";
  gender: "MALE" | "FEMALE" | null;
  name: string;
  minAge: number | null;
  maxAge: number | null;
}[] = [
  { key: "MASTER_MALE", level: "MASTER", gender: "MALE", name: "Master Masculino", minAge: 40, maxAge: null },
  { key: "MASTER_FEMALE", level: "MASTER", gender: "FEMALE", name: "Master Femenino", minAge: 40, maxAge: null },
  { key: "JUNIOR", level: "JUNIOR", gender: null, name: "Junior", minAge: null, maxAge: 17 },
];

/**
 * Nombre para mostrar de CUALQUIER categoría — por nivel (1ra..7ma + género)
 * o por edad (Master/Junior). categoryName() de arriba sigue existiendo tal
 * cual porque category-grid.tsx la llama directo con level/gender ya
 * conocidos al crear la celda; esta es la que hace falta donde solo se tiene
 * la fila ya guardada (level como string, posible "MASTER"/"JUNIOR").
 */
export function categoryDisplayName(category: { level: string; genderRestriction: GenderType | null }): string {
  const ageMatch = AGE_CATEGORIES.find((a) => a.level === category.level && a.gender === category.genderRestriction);
  if (ageMatch) return ageMatch.name;
  const level = Number(category.level);
  if (!Number.isNaN(level) && category.genderRestriction) {
    return categoryName(level, category.genderRestriction as "MALE" | "FEMALE" | "MIXED");
  }
  return category.level;
}
