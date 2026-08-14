import { z } from "zod";
import type { OrganizerType } from "@/lib/supabase/database.types";

export interface Organizer {
  id: string;
  userId: string;
  name: string;
  type: OrganizerType;
}

export const organizerSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre del organizador."),
  type: z.enum(["INDIVIDUAL", "COMPANY"]),
});

export type OrganizerInput = z.infer<typeof organizerSchema>;
