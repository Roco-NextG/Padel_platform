"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { createPlayer, fetchPlayerById, updatePlayer, type PlayerInput } from "../infrastructure/playerRepository";
import type { VisiblePlayer } from "../domain/player";
import type { GenderType } from "@/lib/supabase/database.types";

export interface PlayerFormState {
  error: string | null;
  player: VisiblePlayer | null;
}

function parsePlayerInput(formData: FormData): { input: PlayerInput | null; error: string | null } {
  const firstName = (formData.get("firstName") as string | null)?.trim() ?? "";
  const lastName = (formData.get("lastName") as string | null)?.trim() ?? "";
  const email = ((formData.get("email") as string | null) ?? "").trim() || null;
  const phone = ((formData.get("phone") as string | null) ?? "").trim() || null;
  const categoryRaw = (formData.get("category") as string | null) ?? "";
  const genderRaw = (formData.get("gender") as string | null) ?? "";

  if (!firstName) return { input: null, error: "El nombre es obligatorio." };
  if (!lastName) return { input: null, error: "El apellido es obligatorio." };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { input: null, error: "El email no es válido." };
  const category = Number(categoryRaw);
  if (!categoryRaw || Number.isNaN(category) || category < 1 || category > 7) {
    return { input: null, error: "Elegí una categoría entre 1 y 7." };
  }

  return {
    input: {
      firstName,
      lastName,
      email,
      phone,
      category,
      gender: (genderRaw || null) as GenderType | null,
    },
    error: null,
  };
}

export interface GetPlayerState {
  error: string | null;
  player: VisiblePlayer | null;
}

export async function getPlayerAction(playerId: string): Promise<GetPlayerState> {
  const context = await getCurrentUserContext();
  if (!context) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", player: null };

  try {
    const player = await fetchPlayerById(playerId);
    if (!player) return { error: "No se encontró el jugador.", player: null };
    return { error: null, player };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo cargar el jugador.", player: null };
  }
}

export async function createPlayerStandaloneAction(_prev: PlayerFormState, formData: FormData): Promise<PlayerFormState> {
  const context = await getCurrentUserContext();
  if (!context) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", player: null };

  const { input, error } = parsePlayerInput(formData);
  if (error || !input) return { error, player: null };

  try {
    const player = await createPlayer(input);
    revalidatePath("/dashboard/jugadores");
    return { error: null, player };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear el jugador.", player: null };
  }
}

export async function updatePlayerAction(playerId: string, _prev: PlayerFormState, formData: FormData): Promise<PlayerFormState> {
  const context = await getCurrentUserContext();
  if (!context) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", player: null };

  const { input, error } = parsePlayerInput(formData);
  if (error || !input) return { error, player: null };

  try {
    const player = await updatePlayer(playerId, input);
    revalidatePath("/dashboard/jugadores");
    return { error: null, player };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo guardar el jugador.", player: null };
  }
}
