import { z } from "zod";
import type { ClubBranding } from "@/lib/supabase/database.types";

export interface Club {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  branding: ClubBranding;
}

const hexColor = z
  .string()
  .trim()
  .regex(/^#?[0-9a-fA-F]{6}$/, "Usa un color hexadecimal, ej. #2454E0.");

export const createClubSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre del club."),
  city: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

export const clubBrandingSchema = z.object({
  primaryColor: hexColor,
  secondaryColor: hexColor.optional().or(z.literal("")),
  accentColor: hexColor.optional().or(z.literal("")),
  logoUrl: z.string().trim().url("Ingresa una URL válida.").optional().or(z.literal("")),
});

export type CreateClubInput = z.infer<typeof createClubSchema>;
export type ClubBrandingInput = z.infer<typeof clubBrandingSchema>;
