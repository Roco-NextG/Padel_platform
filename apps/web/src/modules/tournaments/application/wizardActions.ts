"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { GenderType } from "@/lib/supabase/database.types";
import { fetchAuthenticatedUser } from "@/modules/auth/infrastructure/authRepository";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { getManagedClub } from "@/modules/clubs/application/getManagedClub";
import { getOrganizerForUser } from "@/modules/organizers/application/getOrganizer";
import {
  assignPlayerCategory,
  createPlayerForEnrollment,
  fetchPlayersByIds,
  searchPlayersForEnrollment,
} from "@/modules/players/infrastructure/playerRepository";
import type { EnrollmentPlayerResult } from "@/lib/supabase/database.types";
import {
  certifyPair,
  isCategorySelectionValid,
  type CategoryGenderRestriction,
  type EnrollmentPlayer,
} from "../domain/enrollment";
import {
  deleteSponsor,
  deleteTeam,
  deleteTournamentCategory,
  fetchWizardRoster,
  fetchWizardCategories,
  insertSponsor,
  insertTeamWithMembers,
  insertTournamentCategory,
  insertTournamentDraft,
  publishTournament,
  updateTournamentDetails,
  uploadSponsorLogo,
} from "../infrastructure/tournamentRepository";

export interface WizardActionState {
  error: string | null;
  success: boolean;
}

/**
 * Punto de entrada de "Nuevo torneo" — crea el DRAFT en el acto (docs/11_UX_
 * HANDOFF.md §3.6, paso 1: "INSERT en Tournament con status=DRAFT al crear,
 * no al terminar el wizard") y redirige al editor ya con ese id, igual que
 * createAndOpenTournament() del HTML de referencia. Exige club y organizer
 * ya configurados — mismos requisitos que ya gatea el propio Dashboard
 * ("Para empezar").
 */
export async function createDraftTournamentAndRedirect() {
  const context = await getCurrentUserContext();
  if (!context) redirect("/login");

  const [club, organizer] = await Promise.all([
    getManagedClub(context.userId),
    getOrganizerForUser(context.userId),
  ]);
  if (!club || !organizer) redirect("/dashboard");

  const tournament = await insertTournamentDraft({
    name: "",
    organizerId: organizer.id,
    clubId: club.id,
    startDate: null,
    endDate: null,
    description: null,
    logoUrl: null,
    coverImageUrl: null,
  });

  redirect(`/dashboard/torneos/${tournament.id}/editar`);
}

/** Paso 1 — Datos. */
export async function updateTournamentDetailsAction(
  tournamentId: string,
  _prev: WizardActionState,
  formData: FormData
): Promise<WizardActionState> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", success: false };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "El torneo necesita un nombre.", success: false };

  const startDate = String(formData.get("startDate") ?? "").trim() || null;
  const endDate = String(formData.get("endDate") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  try {
    await updateTournamentDetails(tournamentId, { name, startDate, endDate, description });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudieron guardar los datos. Intenta de nuevo.",
      success: false,
    };
  }

  revalidatePath(`/dashboard/torneos/${tournamentId}/editar`);
  revalidatePath("/dashboard/torneos");
  return { error: null, success: true };
}

/** Paso 3 — Categorías: togglea una celda (nivel × rama). Callable directo, no un <form> — hasta 21 celdas en la grilla. */
export async function toggleTournamentCategoryAction(
  tournamentId: string,
  existingCategoryId: string | null,
  level: number,
  genderRestriction: GenderType
): Promise<{ error: string | null; categoryId: string | null }> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", categoryId: existingCategoryId };

  try {
    if (existingCategoryId) {
      const teams = await fetchWizardRoster(tournamentId);
      if (teams.some((t) => t.categoryId === existingCategoryId)) {
        return {
          error: "Esta categoría ya tiene parejas inscritas — no se puede desactivar.",
          categoryId: existingCategoryId,
        };
      }
      await deleteTournamentCategory(existingCategoryId);
      revalidatePath(`/dashboard/torneos/${tournamentId}/editar`);
      return { error: null, categoryId: null };
    }

    const category = await insertTournamentCategory(tournamentId, level, genderRestriction);
    revalidatePath(`/dashboard/torneos/${tournamentId}/editar`);
    return { error: null, categoryId: category.id };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo actualizar la categoría. Intenta de nuevo.",
      categoryId: existingCategoryId,
    };
  }
}

/** Paso 2 — Patrocinadores: sube el logo a Storage y crea la fila en un solo paso. */
export async function addSponsorAction(
  tournamentId: string,
  _prev: WizardActionState,
  formData: FormData
): Promise<WizardActionState> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", success: false };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "El patrocinador necesita un nombre.", success: false };

  const logo = formData.get("logo");
  if (!(logo instanceof File) || logo.size === 0) {
    return { error: "Selecciona un logo.", success: false };
  }

  try {
    const logoUrl = await uploadSponsorLogo(tournamentId, logo);
    await insertSponsor(tournamentId, name, logoUrl);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo agregar el patrocinador. Intenta de nuevo.",
      success: false,
    };
  }

  revalidatePath(`/dashboard/torneos/${tournamentId}/editar`);
  return { error: null, success: true };
}

export async function removeSponsorAction(tournamentId: string, sponsorId: string): Promise<{ error: string | null }> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  try {
    await deleteSponsor(sponsorId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo quitar el patrocinador." };
  }

  revalidatePath(`/dashboard/torneos/${tournamentId}/editar`);
  return { error: null };
}

/** Paso 4 — búsqueda (Player + auth.users vía RPC, ver 0021). */
export async function searchPlayersAction(query: string): Promise<EnrollmentPlayerResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return searchPlayersForEnrollment(trimmed);
}

/** Paso 4 — "Crear jugador nuevo" inline, sin salir del flujo. user_id queda NULL (jugador importado). */
export async function createPlayerInlineAction(input: {
  firstName: string;
  lastName: string;
  gender: GenderType;
  category: number;
}): Promise<{ error: string | null; player: EnrollmentPlayerResult | null }> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", player: null };

  const firstName = input.firstName.trim();
  if (!firstName) return { error: "El jugador necesita un nombre.", player: null };
  if (input.category < 1 || input.category > 7) {
    return { error: "La categoría debe estar entre 1 y 7.", player: null };
  }

  try {
    const row = await createPlayerForEnrollment({
      firstName,
      lastName: input.lastName.trim(),
      gender: input.gender,
      category: input.category,
    });
    return {
      error: null,
      player: {
        player_id: row.id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: null,
        gender: row.gender,
        category: row.category,
      },
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo crear el jugador. Intenta de nuevo.",
      player: null,
    };
  }
}

/** Paso 4 — un jugador encontrado en la búsqueda SIN category no se deja seleccionar hasta asignarle una (docs/11_UX_HANDOFF.md §3.6, punto 4 de "Inscripciones"). */
export async function assignPlayerCategoryInlineAction(
  playerId: string,
  category: number
): Promise<{ error: string | null; category: number | null }> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", category: null };
  if (category < 1 || category > 7) return { error: "La categoría debe estar entre 1 y 7.", category: null };

  try {
    const row = await assignPlayerCategory(playerId, category);
    return { error: null, category: row.category };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo asignar la categoría. Intenta de nuevo.",
      category: null,
    };
  }
}

/**
 * Paso 4 — inscribir pareja. El cliente ya bloqueó categorías inválidas
 * antes de dejar llegar hasta acá (candado), pero esta acción re-certifica
 * TODO de nuevo con gender/category recién leídos de la base — nunca confía
 * en lo que mandó el formulario (docs/11_UX_HANDOFF.md §4 #9).
 */
export async function enrollPairAction(
  tournamentId: string,
  categoryId: string,
  playerAId: string,
  playerBId: string
): Promise<{ error: string | null; teamId: string | null }> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", teamId: null };
  if (playerAId === playerBId) return { error: "Los dos jugadores no pueden ser el mismo.", teamId: null };

  try {
    const [players, categories] = await Promise.all([
      fetchPlayersByIds([playerAId, playerBId]),
      fetchWizardCategories(tournamentId),
    ]);

    const category = categories.find((c) => c.id === categoryId);
    if (!category) return { error: "Esa categoría ya no está activa en este torneo.", teamId: null };

    const rawA = players.get(playerAId);
    const rawB = players.get(playerBId);
    if (!rawA?.gender || !rawA?.category || !rawB?.gender || !rawB?.category) {
      return { error: "Ambos jugadores necesitan género y categoría asignados.", teamId: null };
    }

    const playerA: EnrollmentPlayer = {
      id: playerAId,
      firstName: "",
      lastName: "",
      gender: rawA.gender,
      category: rawA.category,
    };
    const playerB: EnrollmentPlayer = {
      id: playerBId,
      firstName: "",
      lastName: "",
      gender: rawB.gender,
      category: rawB.category,
    };
    const certification = certifyPair(playerA, playerB);

    // gender_restriction en tournament_categories nunca es OTHER en la práctica — esta pantalla
    // solo escribe MALE/FEMALE/MIXED (ver insertTournamentCategory) — el tipo de columna es más
    // amplio porque reusa gender_type (0020_gender_type_mixed.sql).
    const eligibleCategory = { ...category, genderRestriction: category.genderRestriction as CategoryGenderRestriction };
    if (!isCategorySelectionValid(eligibleCategory, certification)) {
      return {
        error: "Esa categoría no corresponde al nivel certificado de la pareja.",
        teamId: null,
      };
    }

    const teamId = await insertTeamWithMembers(categoryId, playerAId, playerBId);
    revalidatePath(`/dashboard/torneos/${tournamentId}/editar`);
    return { error: null, teamId };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo inscribir la pareja. Intenta de nuevo.",
      teamId: null,
    };
  }
}

export async function removeTeamAction(tournamentId: string, teamId: string): Promise<{ error: string | null }> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  try {
    await deleteTeam(teamId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo quitar la pareja." };
  }

  revalidatePath(`/dashboard/torneos/${tournamentId}/editar`);
  return { error: null };
}

/** Paso 5 — Publicar. */
/* eslint-disable @typescript-eslint/no-unused-vars */
export async function publishTournamentAction(
  tournamentId: string,
  _prev: WizardActionState,
  _formData: FormData
): Promise<WizardActionState> {
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", success: false };

  try {
    await publishTournament(tournamentId);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo publicar el torneo. Intenta de nuevo.",
      success: false,
    };
  }

  revalidatePath(`/dashboard/torneos/${tournamentId}/editar`);
  revalidatePath(`/dashboard/torneos/${tournamentId}`);
  revalidatePath("/dashboard/torneos");
  redirect("/dashboard/torneos");
}
