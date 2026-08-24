"use server";

import { revalidatePath } from "next/cache";
import { addCategory, removeCategory } from "../infrastructure/tournamentRepository";
import { requireTournamentManager } from "./authGuard";

export interface SimpleActionState {
  error: string | null;
}

export async function toggleCategoryAction(
  tournamentId: string,
  existingCategoryId: string | null,
  level: number,
  gender: "MALE" | "FEMALE" | "MIXED",
  usesGroupStage: boolean
): Promise<SimpleActionState> {
  const auth = await requireTournamentManager(tournamentId);
  if (!auth.ok) return { error: auth.error };

  try {
    if (existingCategoryId) {
      await removeCategory(existingCategoryId);
    } else {
      await addCategory(tournamentId, level, gender, usesGroupStage);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo actualizar la categoría." };
  }

  revalidatePath(`/dashboard/torneos/${tournamentId}/editar`);
  return { error: null };
}
