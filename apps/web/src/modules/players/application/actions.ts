"use server";

import { revalidatePath } from "next/cache";
import { playerProfileSchema } from "../domain/player";
import { fetchAuthenticatedUser } from "@/modules/auth/infrastructure/authRepository";
import { fetchPlayerByUserId, updatePlayer } from "../infrastructure/playerRepository";

export interface PlayerActionState {
  error: string | null;
  success: boolean;
}

export async function updatePlayerProfileAction(
  _prev: PlayerActionState,
  formData: FormData
): Promise<PlayerActionState> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", success: false };

  const parsed = playerProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    birthDate: formData.get("birthDate") || undefined,
    gender: formData.get("gender") || undefined,
    city: formData.get("city") || undefined,
    hand: formData.get("hand") || undefined,
    preferredPosition: formData.get("preferredPosition") || undefined,
    publicProfile: formData.get("publicProfile") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos ingresados.", success: false };
  }

  const player = await fetchPlayerByUserId(user.id);
  if (!player) return { error: "No se encontró tu perfil de jugador.", success: false };

  try {
    await updatePlayer(player.id, {
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      birth_date: parsed.data.birthDate || null,
      gender: parsed.data.gender || null,
      city: parsed.data.city || null,
      hand: parsed.data.hand || null,
      preferred_position: parsed.data.preferredPosition || null,
      public_profile: parsed.data.publicProfile,
    });
  } catch {
    return { error: "No se pudo guardar el perfil. Intenta de nuevo.", success: false };
  }

  revalidatePath("/perfil");
  return { error: null, success: true };
}
