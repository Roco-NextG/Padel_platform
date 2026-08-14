import { fetchManagedClub } from "../infrastructure/clubRepository";
import type { Club } from "../domain/club";

export async function getManagedClub(userId: string): Promise<Club | null> {
  const row = await fetchManagedClub(userId);
  if (!row) return null;
  return { id: row.id, name: row.name, city: row.city, address: row.address, branding: row.branding };
}
