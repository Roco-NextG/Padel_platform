import type { GenderType } from "@/lib/supabase/database.types";

export interface VisiblePlayer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  rating: number | null;
  ratingDeviation: number | null;
  category: number | null;
  gender: GenderType | null;
}

export type Confidence = "Alta" | "Media" | "Baja";

/** RD bajo = rating ya asentado (muchos partidos); RD alto (350 default de cold start) = todavía sin suficiente historial. */
export function confidenceFromRD(rd: number | null): Confidence {
  if (rd === null) return "Baja";
  if (rd <= 100) return "Alta";
  if (rd <= 250) return "Media";
  return "Baja";
}

export type Trend = "up" | "down" | "flat";

export interface PlayerRankingItem extends VisiblePlayer {
  ratingHistory: number[];
  trend: Trend;
  trendDelta: number;
}

export function playerName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

export function categoryLabel(category: number | null): string {
  return category === null ? "Sin categoría" : `Cat. ${category}`;
}
