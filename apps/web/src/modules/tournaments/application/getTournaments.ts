import type { Database } from "@/lib/supabase/database.types";
import {
  fetchCategoriesWithSummary,
  fetchTournamentById,
  fetchTournamentCardCounts,
  fetchTournamentsForOrganizerView,
  type CategorySummary,
} from "../infrastructure/tournamentRepository";
import { deriveTournamentCardStatus, type TournamentCardStatus } from "../domain/tournament";

type TournamentRow = Database["public"]["Tables"]["tournaments"]["Row"];

export async function getTournamentList(): Promise<TournamentRow[]> {
  return fetchTournamentsForOrganizerView();
}

export interface TournamentCard {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  cardStatus: TournamentCardStatus;
  categoryCount: number;
  teamCount: number;
}

/** Vista para el grid de "Mis Torneos" — reusa getTournamentList() tal cual y le suma conteos + el badge derivado (11_UX_HANDOFF.md §3.6). */
export async function getTournamentCards(): Promise<TournamentCard[]> {
  const tournaments = await getTournamentList();
  const counts = await fetchTournamentCardCounts(tournaments.map((t) => t.id));

  return tournaments.map((t) => {
    const { categoryCount, teamCount } = counts.get(t.id) ?? { categoryCount: 0, teamCount: 0 };
    return {
      id: t.id,
      name: t.name,
      startDate: t.start_date,
      endDate: t.end_date,
      cardStatus: deriveTournamentCardStatus({
        isPublished: t.is_published,
        status: t.status,
        name: t.name,
        categoryCount,
      }),
      categoryCount,
      teamCount,
    };
  });
}

export async function getTournamentDetail(
  tournamentId: string
): Promise<{ tournament: TournamentRow; categories: CategorySummary[] } | null> {
  const tournament = await fetchTournamentById(tournamentId);
  if (!tournament) return null;
  const categories = await fetchCategoriesWithSummary(tournamentId);
  return { tournament, categories };
}
