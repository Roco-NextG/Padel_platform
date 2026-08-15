import { fetchBracketForCategory, type BracketDisplayRound } from "../infrastructure/tournamentRepository";

export async function getBracketView(categoryId: string): Promise<BracketDisplayRound[]> {
  return fetchBracketForCategory(categoryId);
}
