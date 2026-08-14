"use server";

import { revalidatePath } from "next/cache";
import { createClubSchema, clubBrandingSchema } from "../domain/club";
import { createClub, updateClubBranding, fetchManagedClub } from "../infrastructure/clubRepository";
import { validateBrandingContrast } from "@/lib/color/contrast";
import { fetchAuthenticatedUser } from "@/modules/auth/infrastructure/authRepository";

export interface ClubActionState {
  error: string | null;
  success: boolean;
}

export async function createClubAction(
  _prev: ClubActionState,
  formData: FormData
): Promise<ClubActionState> {
  const parsed = createClubSchema.safeParse({
    name: formData.get("name"),
    city: formData.get("city") || undefined,
    address: formData.get("address") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos ingresados.", success: false };
  }

  try {
    await createClub(parsed.data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("create_club")) {
      return {
        error:
          "Necesitas que un administrador te otorgue el rol de Dueño de Club antes de poder crear uno.",
        success: false,
      };
    }
    return { error: "No se pudo crear el club. Intenta de nuevo.", success: false };
  }

  revalidatePath("/dashboard/club");
  return { error: null, success: true };
}

export async function updateClubBrandingAction(
  _prev: ClubActionState,
  formData: FormData
): Promise<ClubActionState> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", success: false };

  const parsed = clubBrandingSchema.safeParse({
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor") || undefined,
    accentColor: formData.get("accentColor") || undefined,
    logoUrl: formData.get("logoUrl") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los colores ingresados.", success: false };
  }

  const issues = validateBrandingContrast({
    primaryColor: parsed.data.primaryColor,
    secondaryColor: parsed.data.secondaryColor || null,
    accentColor: parsed.data.accentColor || null,
  });
  if (issues.length > 0) {
    return {
      error:
        "Ese color no cumple el contraste mínimo (WCAG AA) sobre fondo claro u oscuro. Elige un tono más oscuro o más saturado.",
      success: false,
    };
  }

  const club = await fetchManagedClub(user.id);
  if (!club) return { error: "No administras ningún club todavía.", success: false };

  try {
    await updateClubBranding(club.id, {
      primary_color: parsed.data.primaryColor,
      secondary_color: parsed.data.secondaryColor || null,
      accent: parsed.data.accentColor || null,
      logo_url: parsed.data.logoUrl || null,
    });
  } catch {
    return { error: "No se pudo guardar el branding. Intenta de nuevo.", success: false };
  }

  revalidatePath("/dashboard/club");
  return { error: null, success: true };
}
