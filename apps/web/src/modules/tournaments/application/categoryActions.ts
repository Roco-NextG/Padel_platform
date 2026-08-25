"use server";

import { revalidatePath } from "next/cache";
import { addCategory, removeCategory } from "../infrastructure/tournamentRepository";
import { requireTournamentManager } from "./authGuard";

export interface SimpleActionState {
  error: string | null;
}

export interface ToggleCategoryState {
  error: string | null;
  /** id de la categoría recién creada — null si esta llamada borró una en vez de crearla. */
  createdId: string | null;
}

export async function toggleCategoryAction(
  tournamentId: string,
  existingCategoryId: string | null,
  level: number,
  gender: "MALE" | "FEMALE" | "MIXED",
  usesGroupStage: boolean
): Promise<ToggleCategoryState> {
  const auth = await requireTournamentManager(tournamentId);
  if (!auth.ok) return { error: auth.error, createdId: null };

  let createdId: string | null = null;
  try {
    if (existingCategoryId) {
      await removeCategory(existingCategoryId);
    } else {
      createdId = await addCategory(tournamentId, level, gender, usesGroupStage);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo actualizar la categoría.", createdId: null };
  }

  revalidatePath(`/dashboard/torneos/${tournamentId}/editar`);
  return { error: null, createdId };
}
