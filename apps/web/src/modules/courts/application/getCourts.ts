import { fetchClubCourtsFull } from "../infrastructure/courtRepository";
import type { Court } from "../domain/court";

export async function getClubCourts(clubId: string): Promise<Court[]> {
  return fetchClubCourtsFull(clubId);
}
