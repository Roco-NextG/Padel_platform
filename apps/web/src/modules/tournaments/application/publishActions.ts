"use server";

import { revalidatePath } from "next/cache";
import { fetchCategories, setTournamentPublished } from "../infrastructure/tournamentRepository";
import { fetchTeamsForCategory } from "../infrastructure/enrollmentRepository";
import { requireTournamentManager } from "./authGuard";

export interface SimpleActionState {
  error: string | null;
}

export async function publishTournamentAction(tournamentId: string): Promise<SimpleActionState> {
  const auth = await requireTournamentManager(tournamentId);
  if (!auth.ok) return { error: auth.error };

  const categories = await fetchCategories(tournamentId);
  if (categories.length === 0) {
    return { error: "Agregá al menos una categoría antes de publicar." };
  }
  const teamCounts = await Promise.all(categories.map((c) => fetchTeamsForCategory(c.id)));
  if (!teamCounts.some((teams) => teams.length > 0)) {
    return { error: "Inscribí al menos una pareja antes de publicar." };
  }

  try {
    await setTournamentPublished(tournamentId, true);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo publicar el torneo." };
  }

  revalidatePath(`/dashboard/torneos/${tournamentId}/editar`);
  revalidatePath("/dashboard/torneos");
  return { error: null };
}

export async function unpublishTournamentAction(tournamentId: string): Promise<SimpleActionState> {
  const auth = await requireTournamentManager(tournamentId);
  if (!auth.ok) return { error: auth.error };

  try {
    await setTournamentPublished(tournamentId, false);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo despublicar el torneo." };
  }

  revalidatePath(`/dashboard/torneos/${tournamentId}/editar`);
  revalidatePath("/dashboard/torneos");
  return { error: null };
}
