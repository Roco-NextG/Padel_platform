import { fetchLeagueById } from "../infrastructure/leagueRepository";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { isClub, isOrganizer } from "@/modules/auth/domain/roles";

/** Espeja is_league_manager() (0027_league_rls.sql) en la capa de app — defensa en profundidad, la RLS es la fuente real. */
export async function requireLeagueManager(leagueId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const context = await getCurrentUserContext();
  if (!context) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  const league = await fetchLeagueById(leagueId);
  if (!league) return { ok: false, error: "La liga no existe." };

  const manages = league.organizerId ? isOrganizer(context.roles, league.organizerId) : isClub(context.roles, league.clubId);
  if (!manages) return { ok: false, error: "No administras esta liga." };

  return { ok: true };
}
