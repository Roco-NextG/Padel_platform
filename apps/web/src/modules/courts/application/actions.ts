"use server";

import { revalidatePath } from "next/cache";
import { courtNameSchema } from "../domain/court";
import { fetchClubCourts, insertCourt, setCourtStatus, updateCourtName } from "../infrastructure/courtRepository";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { isClub } from "@/modules/auth/domain/roles";

export interface SimpleActionState {
  error: string | null;
}

async function requireOwnClub(clubId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const context = await getCurrentUserContext();
  if (!context) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  if (!isClub(context.roles, clubId)) return { ok: false, error: "No administras este club." };
  return { ok: true };
}

export async function addCourtAction(clubId: string): Promise<SimpleActionState> {
  const auth = await requireOwnClub(clubId);
  if (!auth.ok) return { error: auth.error };

  try {
    const existing = await fetchClubCourts(clubId);
    await insertCourt(clubId, existing);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo agregar la pista." };
  }

  revalidatePath("/dashboard/configuracion");
  return { error: null };
}

export async function renameCourtAction(clubId: string, courtId: string, name: string): Promise<SimpleActionState> {
  const auth = await requireOwnClub(clubId);
  if (!auth.ok) return { error: auth.error };

  const parsed = courtNameSchema.safeParse({ name });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el nombre." };

  try {
    await updateCourtName(courtId, parsed.data.name);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo renombrar la pista." };
  }

  revalidatePath("/dashboard/configuracion");
  return { error: null };
}

export async function toggleCourtStatusAction(clubId: string, courtId: string, disable: boolean): Promise<SimpleActionState> {
  const auth = await requireOwnClub(clubId);
  if (!auth.ok) return { error: auth.error };

  try {
    await setCourtStatus(courtId, disable ? "DISABLED" : "AVAILABLE");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo actualizar la pista." };
  }

  revalidatePath("/dashboard/configuracion");
  return { error: null };
}
