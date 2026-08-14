import { fetchPlayerByUserId } from "../infrastructure/playerRepository";
import type { Player } from "../domain/player";

export async function getPlayerProfileForUser(userId: string): Promise<Player | null> {
  const row = await fetchPlayerByUserId(userId);
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    photoUrl: row.photo_url,
    birthDate: row.birth_date,
    gender: row.gender,
    city: row.city,
    hand: row.hand,
    preferredPosition: row.preferred_position,
    publicProfile: row.public_profile,
    currentRating: row.current_rating,
    currentRatingDeviation: row.current_rating_deviation,
  };
}
