"use server";

import { revalidatePath } from "next/cache";
import { organizerSchema } from "../domain/organizer";
import {
  fetchOrganizerByUserId,
  insertOrganizer,
  updateOrganizer,
} from "../infrastructure/organizerRepository";
import { fetchAuthenticatedUser } from "@/modules/auth/infrastructure/authRepository";

export interface OrganizerActionState {
  error: string | null;
  success: boolean;
}

export async function saveOrganizerAction(
  _prev: OrganizerActionState,
  formData: FormData
): Promise<OrganizerActionState> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", success: false };

  const parsed = organizerSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos ingresados.", success: false };
  }

  try {
    const existing = await fetchOrganizerByUserId(user.id);
    if (existing) {
      await updateOrganizer(existing.id, parsed.data);
    } else {
      await insertOrganizer({ userId: user.id, ...parsed.data });
    }
  } catch {
    return { error: "No se pudo guardar el organizador. Intenta de nuevo.", success: false };
  }

  revalidatePath("/dashboard/organizador");
  return { error: null, success: true };
}
