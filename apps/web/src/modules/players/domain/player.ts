import { z } from "zod";
import type { GenderType, HandType, PositionType } from "@/lib/supabase/database.types";

export interface Player {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  birthDate: string | null;
  gender: GenderType | null;
  city: string | null;
  hand: HandType | null;
  preferredPosition: PositionType | null;
  publicProfile: boolean;
  currentRating: number | null;
  currentRatingDeviation: number | null;
}

export const playerProfileSchema = z.object({
  firstName: z.string().trim().min(1, "Ingresa tu nombre."),
  lastName: z.string().trim().min(1, "Ingresa tu apellido."),
  birthDate: z.string().trim().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  city: z.string().trim().optional(),
  hand: z.enum(["RIGHT", "LEFT"]).optional(),
  preferredPosition: z.enum(["DRIVE", "REVES", "BOTH"]).optional(),
  publicProfile: z.boolean(),
});

export type PlayerProfileInput = z.infer<typeof playerProfileSchema>;

/** Rating confidence label — docs/05_RATING_ENGINE.md §6: shown explicitly, never a bare number. */
export function ratingConfidence(rd: number | null): "Baja" | "Media" | "Alta" | null {
  if (rd == null) return null;
  if (rd >= 200) return "Baja";
  if (rd >= 80) return "Media";
  return "Alta";
}
