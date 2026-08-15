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

const SERVER_CONTRAST_PAIR_LABELS: Record<string, string> = {
  "primary-on-white": "Color primario sobre fondo claro",
  "primary-on-black": "Color primario sobre fondo oscuro",
  "secondary-on-white": "Color secundario sobre fondo claro",
  "accent-on-white": "Acento sobre fondo claro",
};

/**
 * Parses the exception raised by the `enforce_branding_contrast` trigger
 * (supabase/migrations/0005_club_audit_and_contrast.sql) into a specific,
 * human-readable message — the trigger is the real guardian (client-side
 * validation in lib/color/contrast.ts is only immediate feedback, and the
 * server wins if the two ever diverge), so a rejection it catches on its
 * own must never surface as a raw, unformatted Postgres error.
 *
 * Returns null when `message` isn't this trigger's error, so the caller can
 * fall back to a generic message for anything else that goes wrong.
 */
export function parseBrandingContrastError(message: string): string | null {
  const marker = "branding no cumple contraste WCAG AA: ";
  const start = message.indexOf(marker);
  if (start === -1) return null;

  const detail = message
    .slice(start + marker.length)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = /^([\w-]+):\s*([\d.]+)\s*\(mínimo\s*([\d.]+)\)$/.exec(part);
      if (!match) return part;
      const [, pair, ratio, required] = match;
      return `${SERVER_CONTRAST_PAIR_LABELS[pair] ?? pair}: contraste ${ratio} (mínimo ${required})`;
    })
    .join(" · ");

  return `El branding no cumple el contraste mínimo (WCAG AA). ${detail}. Elige tonos más oscuros o más saturados.`;
}
