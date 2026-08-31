"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { fetchClubSurfaceAccount, updateAccountProfile, updateAccountTimeZone } from "../infrastructure/accountRepository";
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

export interface UpdateProfileState {
  error: string | null;
  ok: boolean;
}

export async function updateAccountProfileAction(_prev: UpdateProfileState, formData: FormData): Promise<UpdateProfileState> {
  const context = await getCurrentUserContext();
  if (!context) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", ok: false };

  const account = await fetchClubSurfaceAccount(context.userId);
  if (!account) return { error: "Esta cuenta no tiene club u organizador asociado.", ok: false };

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) return { error: "El nombre es obligatorio.", ok: false };

  // Club manda un solo campo "Persona de contacto" (contactName, texto libre,
  // igual que el mockup) — se separa acá en first/last. Organizador manda
  // Nombre/Apellidos ya separados, sin necesidad de heurística.
  const contactNameCombined = ((formData.get("contactName") as string | null) ?? "").trim();
  let contactFirstName = ((formData.get("contactFirstName") as string | null) ?? "").trim() || null;
  let contactLastName = ((formData.get("contactLastName") as string | null) ?? "").trim() || null;
  if (contactNameCombined) {
    const [first, ...rest] = contactNameCombined.split(/\s+/);
    contactFirstName = first;
    contactLastName = rest.join(" ") || null;
  }
  const contactPhone = ((formData.get("contactPhone") as string | null) ?? "").trim() || null;
  const contactEmail = ((formData.get("contactEmail") as string | null) ?? "").trim() || null;
  const address = ((formData.get("address") as string | null) ?? "").trim() || null;

  try {
    await updateAccountProfile(account, { name, contactFirstName, contactLastName, contactPhone, contactEmail, address });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo guardar.", ok: false };
  }

  revalidatePath("/dashboard", "layout");
  return { error: null, ok: true };
}
