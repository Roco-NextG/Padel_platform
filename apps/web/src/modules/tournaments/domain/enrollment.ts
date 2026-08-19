import type { GenderType } from "@/lib/supabase/database.types";

/** Rama de categoría — nunca "OTHER": una TournamentCategory solo se restringe a MALE/FEMALE/MIXED (0020_gender_type_mixed.sql). */
export type CategoryGenderRestriction = "MALE" | "FEMALE" | "MIXED";

export interface EnrollmentPlayer {
  id: string;
  firstName: string;
  lastName: string;
  /** Requerido para certificar — un jugador sin gender/category no puede llegar a este punto (se lo intercepta antes, ver assign_player_category). */
  gender: GenderType;
  category: number;
}

export const CATEGORY_LEVELS = [1, 2, 3, 4, 5, 6, 7] as const;

export const GENDER_RESTRICTION_LABEL: Record<CategoryGenderRestriction, string> = {
  MALE: "Masculina",
  FEMALE: "Femenina",
  MIXED: "Mixta",
};

/**
 * docs/11_UX_HANDOFF.md §3.6: "Masculina si ambos son hombres, Femenina si
 * ambas mujeres, Mixta si uno de cada uno" — cualquier otra combinación
 * (incluido OTHER, en cualquiera de los dos) certifica como Mixta, nunca
 * bloquea la inscripción.
 */
export function deriveGenderRestriction(
  genderA: GenderType,
  genderB: GenderType
): CategoryGenderRestriction {
  if (genderA === "MALE" && genderB === "MALE") return "MALE";
  if (genderA === "FEMALE" && genderB === "FEMALE") return "FEMALE";
  return "MIXED";
}

export interface PairCertification {
  determiningPlayer: EnrollmentPlayer;
  otherPlayer: EnrollmentPlayer;
  /** El MEJOR (número más bajo) de los dos — el que certifica a la pareja. */
  certifiedLevel: number;
  genderRestriction: CategoryGenderRestriction;
}

/** El nivel que certifica a la pareja es el mejor de los dos jugadores — el otro nunca la arrastra hacia abajo (docs/11_UX_HANDOFF.md §3.6, punto 3). */
export function certifyPair(playerA: EnrollmentPlayer, playerB: EnrollmentPlayer): PairCertification {
  const determiningPlayer = playerA.category <= playerB.category ? playerA : playerB;
  const otherPlayer = determiningPlayer === playerA ? playerB : playerA;
  return {
    determiningPlayer,
    otherPlayer,
    certifiedLevel: determiningPlayer.category,
    genderRestriction: deriveGenderRestriction(playerA.gender, playerB.gender),
  };
}

export interface EnrollableCategory {
  id: string;
  /** TournamentCategory.level se guarda como texto ("1".."7") — se compara como número acá. */
  level: number;
  genderRestriction: CategoryGenderRestriction;
}

/**
 * Categorías activas de este torneo, de la misma rama que la pareja, que su
 * nivel certificado alcanza a jugar — nunca una peor (número más alto) que
 * el suyo. `locked` es la parte que la UI usa para mostrar el candado ANTES
 * del submit (docs/11_UX_HANDOFF.md §3.6, punto 5) — nunca se omiten las
 * categorías bloqueadas de la lista, solo se marcan.
 */
export function categoriesForCertification(
  categories: EnrollableCategory[],
  certification: PairCertification
): { category: EnrollableCategory; locked: boolean }[] {
  return categories
    .filter((c) => c.genderRestriction === certification.genderRestriction)
    .sort((a, b) => a.level - b.level)
    .map((category) => ({ category, locked: category.level > certification.certifiedLevel }));
}

/** Mismo chequeo que categoriesForCertification, pero para revalidar en el server antes del INSERT (docs/11_UX_HANDOFF.md §4 #9) — nunca confiar en que el cliente ya bloqueó la opción inválida. */
export function isCategorySelectionValid(
  category: EnrollableCategory,
  certification: PairCertification
): boolean {
  return (
    category.genderRestriction === certification.genderRestriction &&
    category.level <= certification.certifiedLevel
  );
}
