import { fetchOrganizerByUserId } from "../infrastructure/organizerRepository";
import type { Organizer } from "../domain/organizer";

export async function getOrganizerForUser(userId: string): Promise<Organizer | null> {
  const row = await fetchOrganizerByUserId(userId);
  if (!row) return null;
  return { id: row.id, userId: row.user_id, name: row.name, type: row.type };
}
