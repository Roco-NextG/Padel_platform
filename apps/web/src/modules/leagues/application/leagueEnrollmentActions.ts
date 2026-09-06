"use server";

import { revalidatePath } from "next/cache";
import {
  assignPlayerCategory,
  createPlayerForEnrollment,
  createLeagueTeam,
  getPlayersByIds,
  removeTeam,
  searchPlayersForLeague,
} from "../infrastructure/leagueEnrollmentRepository";
import { validateTeamGender } from "@/modules/tournaments/domain/enrollment";
import { requireLeagueManager } from "./leagueAuthGuard";
import type { GenderType } from "@/lib/supabase/database.types";
import type { PlayerSearchResult } from "@/modules/tournaments/domain/enrollment";

export interface SearchPlayersState {
  error: string | null;
  results: PlayerSearchResult[];
}

export async function searchPlayersForLeagueAction(leagueId: string, query: string): Promise<SearchPlayersState> {
  const auth = await requireLeagueManager(leagueId);
  if (!auth.ok) return { error: auth.error, results: [] };
  if (query.trim().length < 2) return { error: null, results: [] };

  try {
    const results = await searchPlayersForLeague(leagueId, query.trim());
    return { error: null, results };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo buscar jugadores.", results: [] };
  }
}

export interface CreatePlayerState {
  error: string | null;
  player: PlayerSearchResult | null;
}

export async function createPlayerForLeagueAction(
  leagueId: string,
  firstName: string,
  lastName: string,
  gender: GenderType,
  category: number,
  phone: string,
  email: string
): Promise<CreatePlayerState> {
  const auth = await requireLeagueManager(leagueId);
  if (!auth.ok) return { error: auth.error, player: null };
  if (!firstName.trim()) return { error: "El nombre es obligatorio.", player: null };
  if (!lastName.trim()) return { error: "El apellido es obligatorio.", player: null };
  if (!phone.trim()) return { error: "El teléfono es obligatorio.", player: null };
  if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) return { error: "El email no es válido.", player: null };
  if (category < 1 || category > 7) return { error: "La categoría debe estar entre 1 y 7.", player: null };

  try {
    const player = await createPlayerForEnrollment(firstName, lastName, gender, category, phone.trim(), email.trim());
    return { error: null, player };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear el jugador.", player: null };
  }
}

export interface SimpleActionState {
  error: string | null;
}

export async function assignCategoryForLeagueAction(leagueId: string, playerId: string, category: number): Promise<SimpleActionState> {
  const auth = await requireLeagueManager(leagueId);
  if (!auth.ok) return { error: auth.error };
  if (category < 1 || category > 7) return { error: "La categoría debe estar entre 1 y 7." };

  try {
    await assignPlayerCategory(playerId, category);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo asignar la categoría." };
  }
  return { error: null };
}

export interface EnrollTeamState {
  error: string | null;
  teamId: string | null;
}

export async function enrollLeagueTeamAction(
  leagueId: string,
  categoryId: string,
  categoryGender: "MALE" | "FEMALE" | "MIXED",
  playerIds: [string, string]
): Promise<EnrollTeamState> {
  const auth = await requireLeagueManager(leagueId);
  if (!auth.ok) return { error: auth.error, teamId: null };

  let teamId: string;
  try {
    const players = await getPlayersByIds(playerIds);
    if (players.length !== 2) return { error: "No se encontraron los dos jugadores.", teamId: null };
    if (players.some((p) => p.category === null)) {
      return { error: "Ambos jugadores necesitan una categoría asignada antes de inscribirse.", teamId: null };
    }

    const genderError = validateTeamGender(
      categoryGender,
      players.map((p) => p.gender)
    );
    if (genderError) return { error: genderError, teamId: null };

    teamId = await createLeagueTeam(categoryId, playerIds);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo inscribir la pareja.", teamId: null };
  }

  revalidatePath(`/dashboard/ligas/${leagueId}/editar`);
  return { error: null, teamId };
}

export async function removeLeagueTeamAction(leagueId: string, teamId: string): Promise<SimpleActionState> {
  const auth = await requireLeagueManager(leagueId);
  if (!auth.ok) return { error: auth.error };

  try {
    await removeTeam(teamId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo quitar la pareja." };
  }

  revalidatePath(`/dashboard/ligas/${leagueId}/editar`);
  return { error: null };
}
