"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { fetchClubSurfaceAccount, updateAccountTimeZone } from "../infrastructure/accountRepository";
import { listTimeZones } from "@/lib/timezone";

export interface SimpleActionState {
  error: string | null;
}

export async function updateTimeZoneAction(timeZone: string): Promise<SimpleActionState> {
  if (!listTimeZones().includes(timeZone)) return { error: "Zona horaria inválida." };

  const context = await getCurrentUserContext();
  if (!context) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  const account = await fetchClubSurfaceAccount(context.userId);
  if (!account) return { error: "Esta cuenta no tiene club u organizador asociado." };

  try {
    await updateAccountTimeZone(account, timeZone);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo guardar la zona horaria." };
  }

  // Todas las pantallas que muestran hora/fecha dependen de esto — revalida todo el shell del club.
  revalidatePath("/dashboard", "layout");
  return { error: null };
}
