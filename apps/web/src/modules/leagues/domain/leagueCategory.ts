import type { GenderType } from "@/lib/supabase/database.types";

export interface LeagueCategory {
  id: string;
  leagueId: string;
  name: string;
  level: string;
  genderRestriction: GenderType;
}

// Nivel/género/nombre de categoría son un concepto genérico, no propio de
// Torneo — se reutilizan CATEGORY_LEVELS/CATEGORY_GENDERS/categoryName de
// tournaments/domain/category.ts en vez de duplicarlos acá.
export { CATEGORY_LEVELS, CATEGORY_GENDERS, categoryName } from "@/modules/tournaments/domain/category";
