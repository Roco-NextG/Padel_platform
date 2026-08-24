import { fetchTournamentById } from "../infrastructure/tournamentRepository";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { isClub, isOrganizer } from "@/modules/auth/domain/roles";

/** Espeja is_tournament_manager() (0010_tournament_rls.sql) en la capa de app — defensa en profundidad, la RLS es la fuente real. */
export async function requireTournamentManager(tournamentId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const context = await getCurrentUserContext();
  if (!context) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  const tournament = await fetchTournamentById(tournamentId);
  if (!tournament) return { ok: false, error: "El torneo no existe." };

  const manages = tournament.organizerId
    ? isOrganizer(context.roles, tournament.organizerId)
    : isClub(context.roles, tournament.clubId);
  if (!manages) return { ok: false, error: "No administras este torneo." };

  return { ok: true };
}
