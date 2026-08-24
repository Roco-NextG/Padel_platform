"use server";

import { revalidatePath } from "next/cache";
import { insertSponsor, removeSponsor, uploadSponsorLogo } from "../infrastructure/sponsorRepository";
import { ALLOWED_LOGO_TYPES, MAX_LOGO_BYTES } from "../domain/sponsor";
import { requireTournamentManager } from "./authGuard";

export interface SimpleActionState {
  error: string | null;
}

export interface AddSponsorState {
  error: string | null;
  sponsor: { id: string; name: string; logoUrl: string } | null;
}

export async function addSponsorAction(tournamentId: string, formData: FormData): Promise<AddSponsorState> {
  const auth = await requireTournamentManager(tournamentId);
  if (!auth.ok) return { error: auth.error, sponsor: null };

  const name = (formData.get("name") as string | null)?.trim();
  const logo = formData.get("logo") as File | null;

  if (!name) return { error: "El nombre del sponsor es obligatorio.", sponsor: null };
  if (!logo || logo.size === 0) return { error: "Subí un logo.", sponsor: null };
  if (logo.size > MAX_LOGO_BYTES) return { error: "El logo no puede pesar más de 2MB.", sponsor: null };
  if (!ALLOWED_LOGO_TYPES.includes(logo.type)) return { error: "El logo debe ser PNG, JPG, WEBP o SVG.", sponsor: null };

  let logoUrl: string;
  let sponsorId: string;
  try {
    logoUrl = await uploadSponsorLogo(tournamentId, logo);
    sponsorId = await insertSponsor(tournamentId, name, logoUrl);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo agregar el sponsor.", sponsor: null };
  }

  revalidatePath(`/dashboard/torneos/${tournamentId}/editar`);
  return { error: null, sponsor: { id: sponsorId, name, logoUrl } };
}

export async function removeSponsorAction(tournamentId: string, sponsorId: string): Promise<SimpleActionState> {
  const auth = await requireTournamentManager(tournamentId);
  if (!auth.ok) return { error: auth.error };

  try {
    await removeSponsor(sponsorId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo quitar el sponsor." };
  }

  revalidatePath(`/dashboard/torneos/${tournamentId}/editar`);
  return { error: null };
}
