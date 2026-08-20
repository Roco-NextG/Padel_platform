import { z } from "zod";
import type { CourtStatus } from "@/lib/supabase/database.types";

export type { CourtStatus };

export interface Court {
  id: string;
  name: string;
  number: number | null;
  status: CourtStatus;
}

export const courtNameSchema = z.object({
  name: z.string().trim().min(1, "Ingresa un nombre para la pista."),
});
