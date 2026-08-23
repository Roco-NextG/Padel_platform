"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createTournamentSchema } from "../domain/tournament";
import { createTournament } from "../infrastructure/tournamentRepository";
import { fetchClubSurfaceAccount } from "@/modules/shell/infrastructure/accountRepository";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";

export interface CreateTournamentState {
  error: string | null;
}

export async function createTournamentAction(
  _prev: CreateTournamentState,
  formData: FormData
): Promise<CreateTournamentState> {
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
  const parsed = createTournamentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos ingresados." };
  }
  if (account.role === "Organizador" && !parsed.data.hostClubId) {
    return { error: "Elegí en qué club se juega el torneo." };
  }

  let tournamentId: string;
  try {
    tournamentId = await createTournament(account, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear el torneo." };
  }

  revalidatePath("/dashboard/torneos");
  redirect(`/dashboard/torneos/${tournamentId}/editar`);
}
