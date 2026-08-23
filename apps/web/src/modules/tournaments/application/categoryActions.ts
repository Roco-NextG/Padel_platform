"use server";

import { revalidatePath } from "next/cache";
import { addCategory, fetchTournamentById, removeCategory } from "../infrastructure/tournamentRepository";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { isClub, isOrganizer } from "@/modules/auth/domain/roles";

export interface SimpleActionState {
  error: string | null;
}

async function requireTournamentManager(tournamentId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const context = await getCurrentUserContext();
  if (!context) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  const tournament = await fetchTournamentById(tournamentId);
  if (!tournament) return { ok: false, error: "El torneo no existe." };

  const manages = tournament.organizerId
    ? isOrganizer(context.roles, tournament.organizerId)
    : isClub(context.roles, tournament.clubId);
  if (!manages) return { ok: false, error: "No administras este torneo." };

  return { ok: true };
}

export async function toggleCategoryAction(
  tournamentId: string,
  existingCategoryId: string | null,
  level: number,
  gender: "MALE" | "FEMALE" | "MIXED"
): Promise<SimpleActionState> {
  const auth = await requireTournamentManager(tournamentId);
  if (!auth.ok) return { error: auth.error };

  try {
    if (existingCategoryId) {
      await removeCategory(existingCategoryId);
    } else {
      await addCategory(tournamentId, level, gender);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo actualizar la categoría." };
  }

  revalidatePath(`/dashboard/torneos/${tournamentId}/editar`);
  return { error: null };
}
