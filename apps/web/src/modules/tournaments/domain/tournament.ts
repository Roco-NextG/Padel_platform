import { z } from "zod";
import type { TournamentStatus } from "@/lib/supabase/database.types";

export type { TournamentStatus };

export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  clubId: string;
  clubName: string;
  organizerId: string | null;
  status: TournamentStatus;
  isPublished: boolean;
  startDate: string | null;
  endDate: string | null;
  categoryCount: number;
  teamCount: number;
  createdAt: string;
}

const STATUS_LABELS: Record<TournamentStatus, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  REGISTRATION_OPEN: "Inscripciones abiertas",
  REGISTRATION_CLOSED: "Inscripciones cerradas",
  IN_PROGRESS: "En curso",
  FINISHED: "Finalizado",
  CANCELLED: "Cancelado",
  ARCHIVED: "Archivado",
};

export function tournamentStatusLabel(status: TournamentStatus): string {
  return STATUS_LABELS[status];
}

/**
 * El badge de .torneo-card (padel-platform.html) usa solo 3 buckets, no los
 * 8 valores de TournamentStatus — "Configurado" no tiene un status propio
 * en el modelo real, así que se deriva: sin publicar pero con al menos una
 * categoría ya armada. is_published=true cubre PUBLISHED, los REGISTRATION_
 * y IN_PROGRESS/FINISHED por igual — el detalle fino de esos vive en
 * TournamentStatusBadge (usado en las páginas de detalle, no en la card).
 */
export type CardStatus = "borrador" | "configurado" | "publicado";

export function cardStatus(tournament: Pick<Tournament, "isPublished" | "categoryCount">): CardStatus {
  if (tournament.isPublished) return "publicado";
  if (tournament.categoryCount > 0) return "configurado";
  return "borrador";
}

export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  borrador: "Borrador",
  configurado: "Configurado",
  publicado: "Publicado",
};

export const createTournamentSchema = z
  .object({
    name: z.string().trim().min(2, "Ingresa el nombre del torneo."),
    description: z.string().trim().optional(),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    hostClubId: z.string().uuid().optional(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: "La fecha de fin no puede ser anterior a la de inicio.",
    path: ["endDate"],
  });

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
