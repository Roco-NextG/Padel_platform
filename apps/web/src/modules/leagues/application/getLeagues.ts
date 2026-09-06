import { fetchClubSurfaceAccount, type ClubSurfaceAccount } from "@/modules/shell/infrastructure/accountRepository";
import { fetchMyLeagues, fetchLeagueById } from "../infrastructure/leagueRepository";
import type { League } from "../domain/league";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";

export interface MyLeaguesData {
  account: ClubSurfaceAccount | null;
  leagues: League[];
}

export async function getMyLeagues(): Promise<MyLeaguesData> {
  const context = await getCurrentUserContext();
  if (!context) return { account: null, leagues: [] };

  const account = await fetchClubSurfaceAccount(context.userId);
  if (!account) return { account: null, leagues: [] };

  const leagues = await fetchMyLeagues(account);
  return { account, leagues };
}

export async function getLeague(leagueId: string): Promise<League | null> {
  return fetchLeagueById(leagueId);
}
