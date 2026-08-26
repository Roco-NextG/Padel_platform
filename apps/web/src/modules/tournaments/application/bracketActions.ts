"use server";

import { revalidatePath } from "next/cache";
import { generateBracketForCategory, generateGroupStage, swapBracketSlots, swapGroupTeams } from "../infrastructure/bracketRepository";
import { requireTournamentManager } from "./authGuard";

export interface SimpleActionState {
  error: string | null;
}

export interface SwapBracketSlotsActionState {
  error: string | null;
  warning: string | null;
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

export async function swapBracketSlotsAction(
  tournamentId: string,
  matchAId: string,
  sideA: "A" | "B",
  matchBId: string,
  sideB: "A" | "B"
): Promise<SwapBracketSlotsActionState> {
  const auth = await requireTournamentManager(tournamentId);
  if (!auth.ok) return { error: auth.error, warning: null };

  try {
    const { warning } = await swapBracketSlots(matchAId, sideA, matchBId, sideB);
    revalidatePath(`/dashboard/torneos/${tournamentId}/cuadro`);
    revalidatePath("/dashboard/partidos");
    return { error: null, warning };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo intercambiar la pareja.", warning: null };
  }
}

export async function swapGroupTeamsAction(tournamentId: string, teamAId: string, teamBId: string): Promise<SimpleActionState> {
  const auth = await requireTournamentManager(tournamentId);
  if (!auth.ok) return { error: auth.error };

  try {
    await swapGroupTeams(teamAId, teamBId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo mover la pareja de grupo." };
  }

  revalidatePath(`/dashboard/torneos/${tournamentId}/cuadro`);
  revalidatePath("/dashboard/partidos");
  return { error: null };
}
