"use server";

import { revalidatePath } from "next/cache";
import { addLeagueCategory, removeLeagueCategory } from "../infrastructure/leagueRepository";
import { requireLeagueManager } from "./leagueAuthGuard";

export interface ToggleLeagueCategoryState {
  error: string | null;
  /** id de la categoría recién creada — null si esta llamada borró una en vez de crearla. */
  createdId: string | null;
}

export async function toggleLeagueCategoryAction(
  leagueId: string,
  existingCategoryId: string | null,
  level: number,
  gender: "MALE" | "FEMALE" | "MIXED"
): Promise<ToggleLeagueCategoryState> {
  const auth = await requireLeagueManager(leagueId);
  if (!auth.ok) return { error: auth.error, createdId: null };

  let createdId: string | null = null;
  try {
    if (existingCategoryId) {
      await removeLeagueCategory(existingCategoryId);
    } else {
      createdId = await addLeagueCategory(leagueId, level, gender);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo actualizar la categoría.", createdId: null };
  }

  revalidatePath(`/dashboard/ligas/${leagueId}/editar`);
  return { error: null, createdId };
}
