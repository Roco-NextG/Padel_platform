import { z } from "zod";

export interface League {
  id: string;
  name: string;
  description: string | null;
  clubId: string;
  clubName: string;
  clubTimeZone: string;
  organizerId: string | null;
  isPublished: boolean;
  startDate: string | null;
  endDate: string | null;
  categoryCount: number;
  teamCount: number;
  createdAt: string;
}

/** Mismos 3 buckets que cardStatus() de torneos (tournaments/domain/tournament.ts) — una Liga no tiene status propio en DB, solo is_published + si ya tiene categorías armadas. */
export type LeagueCardStatus = "borrador" | "configurado" | "publicado";

export function leagueCardStatus(league: Pick<League, "isPublished" | "categoryCount">): LeagueCardStatus {
  if (league.isPublished) return "publicado";
  if (league.categoryCount > 0) return "configurado";
  return "borrador";
}

export const LEAGUE_CARD_STATUS_LABELS: Record<LeagueCardStatus, string> = {
  borrador: "Borrador",
  configurado: "Configurado",
  publicado: "Publicado",
};

export const createLeagueSchema = z
  .object({
    name: z.string().trim().min(2, "Ingresa el nombre de la liga."),
    description: z.string().trim().optional(),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    hostClubId: z.string().uuid().optional(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: "La fecha de fin no puede ser anterior a la de inicio.",
    path: ["endDate"],
  });

export type CreateLeagueInput = z.infer<typeof createLeagueSchema>;

export const updateLeagueSchema = z
  .object({
    name: z.string().trim().min(2, "Ingresa el nombre de la liga."),
    description: z.string().trim().optional(),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: "La fecha de fin no puede ser anterior a la de inicio.",
    path: ["endDate"],
  });

export type UpdateLeagueInput = z.infer<typeof updateLeagueSchema>;

export const LEAGUE_WIZARD_STEPS = ["datos", "categorias", "inscripciones", "publicar"] as const;
export type LeagueWizardStepId = (typeof LEAGUE_WIZARD_STEPS)[number];

export const LEAGUE_WIZARD_STEP_LABELS: Record<LeagueWizardStepId, string> = {
  datos: "Datos",
  categorias: "Categorías",
  inscripciones: "Inscripciones",
  publicar: "Publicar",
};
