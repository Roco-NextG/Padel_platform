import type { Database } from "@/lib/supabase/database.types";
import {
  fetchCategoriesWithSummary,
  fetchTournamentById,
  fetchTournamentsForOrganizerView,
  type CategorySummary,
} from "../infrastructure/tournamentRepository";

type TournamentRow = Database["public"]["Tables"]["tournaments"]["Row"];

export async function getTournamentList(): Promise<TournamentRow[]> {
  return fetchTournamentsForOrganizerView();
}

export async function getTournamentDetail(
  tournamentId: string
): Promise<{ tournament: TournamentRow; categories: CategorySummary[] } | null> {
  const tournament = await fetchTournamentById(tournamentId);
  if (!tournament) return null;
  const categories = await fetchCategoriesWithSummary(tournamentId);
  return { tournament, categories };
}
