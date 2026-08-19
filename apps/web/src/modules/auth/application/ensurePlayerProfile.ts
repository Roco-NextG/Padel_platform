import type { GenderType } from "@/lib/supabase/database.types";
import { fetchPlayerByUserId, insertPlayer } from "@/modules/players/infrastructure/playerRepository";

/**
 * Every account is a Player by default (docs/02_DOMAIN_MODEL.md §2: User and
 * Player are separate on purpose). We can't write the players row at
 * sign-up time when Supabase requires email confirmation first (no session
 * yet, RLS would reject the insert) — so this runs on first authenticated
 * request instead, seeded from the metadata captured at sign-up.
 *
 * gender/category only come from the sign-up form (signUpSchema requires
 * both there now, docs/11_UX_HANDOFF.md §4 #7) — the sign-in repair path
 * below never has them, so an account created before this existed just
 * stays NULL here, same as any other pre-existing player.
 */
export async function ensurePlayerProfile(
  userId: string,
  meta: { firstName?: string; lastName?: string; gender?: GenderType; category?: number }
) {
  const existing = await fetchPlayerByUserId(userId);
  if (existing) return existing;

  return insertPlayer({
    user_id: userId,
    first_name: meta.firstName?.trim() || "Jugador",
    last_name: meta.lastName?.trim() || "",
    gender: meta.gender ?? null,
    category: meta.category ?? null,
  });
}
