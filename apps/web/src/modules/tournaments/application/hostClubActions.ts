"use server";

import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { isOrganizer } from "@/modules/auth/domain/roles";
import { createClubAsOrganizer, type ClubHostOption } from "@/modules/courts/infrastructure/courtRepository";

export interface CreateHostClubState {
  error: string | null;
  club: ClubHostOption | null;
}

/**
 * Crea un club nuevo (con sus pistas) para destrabar el wizard de Crear
 * Torneo cuando el Organizador no tiene ningún club para elegir como sede
 * — mirror de la validación de rol que hace create_club_as_organizer() en
 * la RPC (defensa en profundidad, la RPC es la fuente real).
 */
export async function createHostClubAction(
  name: string,
  city: string,
  courtCount: number
): Promise<CreateHostClubState> {
  const context = await getCurrentUserContext();
  if (!context) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", club: null };
  if (!isOrganizer(context.roles)) return { error: "Solo una cuenta Organizador puede crear un club nuevo.", club: null };

  if (!name.trim()) return { error: "El nombre del club es obligatorio.", club: null };
  if (!Number.isInteger(courtCount) || courtCount < 1 || courtCount > 20) {
    return { error: "La cantidad de pistas debe ser entre 1 y 20.", club: null };
  }

  try {
    const club = await createClubAsOrganizer(name, city.trim() || null, courtCount);
    return { error: null, club };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear el club.", club: null };
  }
}
