"use server";

import { revalidatePath } from "next/cache";
import { generateBracketForCategory, generateGroupStage } from "../infrastructure/bracketRepository";
import { requireTournamentManager } from "./authGuard";

export interface SimpleActionState {
  error: string | null;
}

export async function generateGroupStageAction(tournamentId: string, categoryId: string): Promise<SimpleActionState> {
  const auth = await requireTournamentManager(tournamentId);
  if (!auth.ok) return { error: auth.error };

  try {
    await generateGroupStage(tournamentId, categoryId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudieron generar los grupos." };
  }

  revalidatePath(`/dashboard/torneos/${tournamentId}/cuadro`);
  return { error: null };
}

export async function generateBracketAction(tournamentId: string, categoryId: string): Promise<SimpleActionState> {
  const auth = await requireTournamentManager(tournamentId);
  if (!auth.ok) return { error: auth.error };

  try {
    await generateBracketForCategory(tournamentId, categoryId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo generar el cuadro." };
  }

  revalidatePath(`/dashboard/torneos/${tournamentId}/cuadro`);
  revalidatePath("/dashboard/partidos");
  return { error: null };
}
