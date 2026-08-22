"use server";

import { revalidatePath } from "next/cache";
import { revokeInvite } from "../infrastructure/adminRepository";
import { fetchAuthenticatedUser } from "@/modules/auth/infrastructure/authRepository";

export interface SimpleActionState {
  error: string | null;
}

export async function revokeInviteAction(inviteId: string): Promise<SimpleActionState> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  try {
    await revokeInvite(inviteId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo revocar la invitación." };
  }

  revalidatePath("/admin/invitaciones");
  return { error: null };
}
