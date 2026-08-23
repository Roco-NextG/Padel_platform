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
