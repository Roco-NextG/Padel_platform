"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createLeagueSchema, updateLeagueSchema } from "../domain/league";
import { createLeague, updateLeague } from "../infrastructure/leagueRepository";
import { fetchClubSurfaceAccount } from "@/modules/shell/infrastructure/accountRepository";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { requireLeagueManager } from "./leagueAuthGuard";

export interface CreateLeagueState {
  error: string | null;
}

export async function createLeagueAction(_prev: CreateLeagueState, formData: FormData): Promise<CreateLeagueState> {
  const context = await getCurrentUserContext();
  if (!context) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  const account = await fetchClubSurfaceAccount(context.userId);
  if (!account) return { error: "Esta cuenta no tiene un club u organizador asociado." };

  const raw = {
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    hostClubId: formData.get("hostClubId") || undefined,
  };
  const parsed = createLeagueSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos ingresados." };
  }
  if (account.role === "Organizador" && !parsed.data.hostClubId) {
    return { error: "Elegí en qué club se juega la liga." };
  }

  let leagueId: string;
  try {
    leagueId = await createLeague(account, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear la liga." };
  }

  revalidatePath("/dashboard/torneos");
  redirect(`/dashboard/ligas/${leagueId}/editar`);
}

export interface UpdateLeagueState {
  error: string | null;
  ok?: boolean;
}

export async function updateLeagueAction(leagueId: string, _prev: UpdateLeagueState, formData: FormData): Promise<UpdateLeagueState> {
  const auth = await requireLeagueManager(leagueId);
  if (!auth.ok) return { error: auth.error };

  const raw = {
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
  };
  const parsed = updateLeagueSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos ingresados." };
  }

  try {
    await updateLeague(leagueId, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo guardar." };
  }

  revalidatePath(`/dashboard/ligas/${leagueId}/editar`);
  revalidatePath("/dashboard/torneos");
  return { error: null, ok: true };
}
