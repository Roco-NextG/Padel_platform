import type { GenderType } from "@/lib/supabase/database.types";

export interface LeagueCategory {
  id: string;
  leagueId: string;
  name: string;
  level: string;
  /** null solo en Junior (ver tournaments/domain/category.ts) — nunca en las categorías por nivel. */
  genderRestriction: GenderType | null;
  minAge: number | null;
  maxAge: number | null;
}

// Nivel/género/nombre/edad de categoría son un concepto genérico, no propio
// de Torneo — se reutilizan de tournaments/domain/category.ts en vez de
// duplicarlos acá.
export {
  CATEGORY_LEVELS,
  CATEGORY_GENDERS,
  categoryName,
  categoryDisplayName,
  AGE_CATEGORIES,
  type AgeCategoryKey,
} from "@/modules/tournaments/domain/category";
