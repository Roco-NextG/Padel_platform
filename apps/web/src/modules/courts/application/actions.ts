"use server";

import { revalidatePath } from "next/cache";
import { courtNameSchema } from "../domain/court";
import type { Court } from "../domain/court";
import { fetchClubCourtsFull, insertCourt, updateCourtName, updateCourtStatus } from "../infrastructure/courtRepository";
import { fetchAuthenticatedUser } from "@/modules/auth/infrastructure/authRepository";
import { fetchManagedClub } from "@/modules/clubs/infrastructure/clubRepository";

export interface SimpleActionState {
  error: string | null;
}

export interface AddCourtState extends SimpleActionState {
  court: Court | null;
}

/**
 * Sin useActionState/<form>: se invocan directo desde onClick/onBlur de
 * CourtsManager (mismo patrón que MatchActionsMenu en redesign/partidos-vivo).
 * La autorización real la impone courts_write RLS (is_club_manager(club_id));
 * este chequeo de sesión solo da un mensaje más claro que el error crudo de
 * Postgres para quien no está logueado.
 */
export async function addCourtAction(): Promise<AddCourtState> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", court: null };

  const club = await fetchManagedClub(user.id);
  if (!club) return { error: "No administras ningún club todavía.", court: null };

  try {
    const existing = await fetchClubCourtsFull(club.id);
    const court = await insertCourt(club.id, existing);
    revalidatePath("/dashboard/club");
    return { error: null, court };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo agregar la pista.", court: null };
  }
}

export async function renameCourtAction(courtId: string, name: string): Promise<SimpleActionState> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  const parsed = courtNameSchema.safeParse({ name });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa el nombre de la pista." };
  }

  try {
    await updateCourtName(courtId, parsed.data.name);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo renombrar la pista." };
  }

  revalidatePath("/dashboard/club");
  return { error: null };
}

export async function setCourtDisabledAction(courtId: string, disabled: boolean): Promise<SimpleActionState> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  try {
    await updateCourtStatus(courtId, disabled ? "DISABLED" : "AVAILABLE");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo actualizar la pista." };
  }

  revalidatePath("/dashboard/club");
  return { error: null };
}
