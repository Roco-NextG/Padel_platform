import type { Database } from "@/lib/supabase/database.types";
import {
  fetchWizardRoster,
  fetchSponsors,
  fetchTournamentById,
  fetchWizardCategories,
  type EnrolledTeam,
  type SponsorRow,
  type WizardCategory,
} from "../infrastructure/tournamentRepository";

type TournamentRow = Database["public"]["Tables"]["tournaments"]["Row"];

export interface WizardData {
  tournament: TournamentRow;
  categories: WizardCategory[];
  sponsors: SponsorRow[];
  teams: EnrolledTeam[];
}

export async function getWizardData(tournamentId: string): Promise<WizardData | null> {
  const tournament = await fetchTournamentById(tournamentId);
  if (!tournament) return null;

  const [categories, sponsors, teams] = await Promise.all([
    fetchWizardCategories(tournamentId),
    fetchSponsors(tournamentId),
    fetchWizardRoster(tournamentId),
  ]);

  return { tournament, categories, sponsors, teams };
}
