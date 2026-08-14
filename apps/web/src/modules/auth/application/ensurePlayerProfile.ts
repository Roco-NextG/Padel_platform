import { fetchPlayerByUserId, insertPlayer } from "@/modules/players/infrastructure/playerRepository";

/**
 * Every account is a Player by default (docs/02_DOMAIN_MODEL.md §2: User and
 * Player are separate on purpose). We can't write the players row at
 * sign-up time when Supabase requires email confirmation first (no session
 * yet, RLS would reject the insert) — so this runs on first authenticated
 * request instead, seeded from the metadata captured at sign-up.
 */
export async function ensurePlayerProfile(
  userId: string,
  meta: { firstName?: string; lastName?: string }
) {
  const existing = await fetchPlayerByUserId(userId);
  if (existing) return existing;

  return insertPlayer({
    user_id: userId,
    first_name: meta.firstName?.trim() || "Jugador",
    last_name: meta.lastName?.trim() || "",
  });
}
