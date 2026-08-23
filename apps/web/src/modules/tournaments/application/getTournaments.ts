import { fetchClubSurfaceAccount, type ClubSurfaceAccount } from "@/modules/shell/infrastructure/accountRepository";
import { fetchMyTournaments, fetchTournamentById } from "../infrastructure/tournamentRepository";
import type { Tournament } from "../domain/tournament";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";

export interface MyTournamentsData {
  account: ClubSurfaceAccount | null;
  tournaments: Tournament[];
}

export async function getMyTournaments(): Promise<MyTournamentsData> {
  const context = await getCurrentUserContext();
  if (!context) return { account: null, tournaments: [] };

  const account = await fetchClubSurfaceAccount(context.userId);
  if (!account) return { account: null, tournaments: [] };

  const tournaments = await fetchMyTournaments(account);
  return { account, tournaments };
}

export async function getTournament(tournamentId: string): Promise<Tournament | null> {
  return fetchTournamentById(tournamentId);
}
