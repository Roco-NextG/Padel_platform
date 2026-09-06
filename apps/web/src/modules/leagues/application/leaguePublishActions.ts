"use server";

import { revalidatePath } from "next/cache";
import { fetchLeagueCategories, setLeaguePublished } from "../infrastructure/leagueRepository";
import { fetchTeamsForLeagueCategory } from "../infrastructure/leagueEnrollmentRepository";
import { requireLeagueManager } from "./leagueAuthGuard";

export interface SimpleActionState {
  error: string | null;
}

export async function publishLeagueAction(leagueId: string): Promise<SimpleActionState> {
  const auth = await requireLeagueManager(leagueId);
  if (!auth.ok) return { error: auth.error };

  const categories = await fetchLeagueCategories(leagueId);
  if (categories.length === 0) {
    return { error: "Agregá al menos una categoría antes de publicar." };
  }
  const teamCounts = await Promise.all(categories.map((c) => fetchTeamsForLeagueCategory(c.id)));
  if (!teamCounts.some((teams) => teams.length > 0)) {
    return { error: "Inscribí al menos una pareja antes de publicar." };
  }

  try {
    await setLeaguePublished(leagueId, true);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo publicar la liga." };
  }

  revalidatePath(`/dashboard/ligas/${leagueId}/editar`);
  revalidatePath("/dashboard/torneos");
  return { error: null };
}

export async function unpublishLeagueAction(leagueId: string): Promise<SimpleActionState> {
  const auth = await requireLeagueManager(leagueId);
  if (!auth.ok) return { error: auth.error };

  try {
    await setLeaguePublished(leagueId, false);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo despublicar la liga." };
  }

  revalidatePath(`/dashboard/ligas/${leagueId}/editar`);
  revalidatePath("/dashboard/torneos");
  return { error: null };
}
