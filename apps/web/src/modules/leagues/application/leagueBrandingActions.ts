"use server";

import { revalidatePath } from "next/cache";
import { uploadLeagueCoverImage, uploadLeagueLogo } from "../infrastructure/leagueRepository";
import { ALLOWED_BRANDING_TYPES, MAX_BRANDING_BYTES } from "@/modules/tournaments/domain/tournament";
import { requireLeagueManager } from "./leagueAuthGuard";

export interface UploadBrandingState {
  error: string | null;
  url: string | null;
}

function validateBrandingFile(file: File | null): string | null {
  if (!file || file.size === 0) return "Elegí una imagen.";
  if (file.size > MAX_BRANDING_BYTES) return "La imagen no puede pesar más de 3MB.";
  if (!ALLOWED_BRANDING_TYPES.includes(file.type)) return "La imagen debe ser PNG, JPG o WEBP.";
  return null;
}

export async function updateLeagueLogoAction(leagueId: string, formData: FormData): Promise<UploadBrandingState> {
  const auth = await requireLeagueManager(leagueId);
  if (!auth.ok) return { error: auth.error, url: null };

  const file = formData.get("logo") as File | null;
  const validationError = validateBrandingFile(file);
  if (validationError) return { error: validationError, url: null };

  try {
    const url = await uploadLeagueLogo(leagueId, file!);
    revalidatePath(`/dashboard/ligas/${leagueId}/editar`);
    revalidatePath("/dashboard/torneos");
    return { error: null, url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo subir el logo.", url: null };
  }
}

export async function updateLeagueCoverImageAction(leagueId: string, formData: FormData): Promise<UploadBrandingState> {
  const auth = await requireLeagueManager(leagueId);
  if (!auth.ok) return { error: auth.error, url: null };

  const file = formData.get("cover") as File | null;
  const validationError = validateBrandingFile(file);
  if (validationError) return { error: validationError, url: null };

  try {
    const url = await uploadLeagueCoverImage(leagueId, file!);
    revalidatePath(`/dashboard/ligas/${leagueId}/editar`);
    revalidatePath("/dashboard/torneos");
    return { error: null, url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo subir la imagen.", url: null };
  }
}
