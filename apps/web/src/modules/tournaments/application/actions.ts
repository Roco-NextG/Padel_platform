"use server";

import { revalidatePath } from "next/cache";
import { fetchAuthenticatedUser } from "@/modules/auth/infrastructure/authRepository";
import { generateBracketForCategory } from "./generateBracketForCategory";

export interface GenerateBracketState {
  error: string | null;
  success: boolean;
}

/**
 * Generación inicial del cuadro directo, disparada a mano por el organizador
 * (docs/04_TOURNAMENT_ENGINE.md §8). La autorización real la impone RLS
 * (tournament_phases_write / matches_write, is_tournament_manager) — este
 * chequeo de sesión solo evita una llamada innecesaria a la base y da un
 * mensaje más claro que el error crudo de Postgres.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
export async function generateBracketAction(
  tournamentId: string,
  categoryId: string,
  _prev: GenerateBracketState,
  _formData: FormData
): Promise<GenerateBracketState> {
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", success: false };

  try {
    await generateBracketForCategory(categoryId);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo generar el cuadro. Intenta de nuevo.",
      success: false,
    };
  }

  revalidatePath(`/dashboard/torneos/${tournamentId}`);
  return { error: null, success: true };
}
