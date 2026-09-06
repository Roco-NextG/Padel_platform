"use server";

import { revalidatePath } from "next/cache";
import { generateLeagueSchedule } from "../infrastructure/leagueScheduleRepository";
import { requireLeagueManager } from "./leagueAuthGuard";

export interface SimpleActionState {
  error: string | null;
}

export async function generateLeagueScheduleAction(leagueId: string, categoryId: string): Promise<SimpleActionState> {
  const auth = await requireLeagueManager(leagueId);
  if (!auth.ok) return { error: auth.error };

  try {
    await generateLeagueSchedule(leagueId, categoryId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudieron generar las jornadas." };
  }

  revalidatePath(`/dashboard/ligas/${leagueId}`);
  return { error: null };
}
