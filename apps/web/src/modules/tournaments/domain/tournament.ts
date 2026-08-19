import type { TournamentStatus } from "@/lib/supabase/database.types";

export type TournamentCardStatus = "borrador" | "configurado" | "publicado";

export const TOURNAMENT_CARD_STATUS_LABEL: Record<TournamentCardStatus, string> = {
  borrador: "Borrador",
  configurado: "Configurado",
  publicado: "Publicado",
};

/**
 * Deriva el badge de 3 estados de "Mis Torneos" (11_UX_HANDOFF.md §3.6) a
 * partir de columnas que ya existen — no hay (ni debería haber) una columna
 * `Tournament.status` propia para esto. is_published manda (gana sobre
 * cualquier `status`); si no, DRAFT + nombre + al menos una categoría es
 * "configurado"; cualquier otro DRAFT es "borrador".
 */
export function deriveTournamentCardStatus(input: {
  isPublished: boolean;
  status: TournamentStatus;
  name: string;
  categoryCount: number;
}): TournamentCardStatus {
  if (input.isPublished) return "publicado";
  if (input.status === "DRAFT" && input.name.trim().length > 0 && input.categoryCount > 0) {
    return "configurado";
  }
  return "borrador";
}
