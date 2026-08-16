"use server";

import { revalidatePath } from "next/cache";
import { fetchAuthenticatedUser } from "@/modules/auth/infrastructure/authRepository";
import { generateBracketForCategory } from "./generateBracketForCategory";
import { generateGroupsForCategory } from "./generateGroupsForCategory";

export interface GenerateBracketState {
  error: string | null;
  success: boolean;
  unresolvedGroupConflicts: number;
}

export interface FormGroupsState {
  error: string | null;
  success: boolean;
}

const DEFAULT_GROUP_SIZE = 4;

/**
 * Formación de grupos, disparada a mano por el organizador al cerrar
 * inscripciones de una categoría con `uses_group_stage` (docs/04 §2). Mismo
 * criterio de autorización que generateBracketAction — RLS es la fuente de
 * verdad, este chequeo solo da un mensaje más claro.
 */
export async function formGroupsAction(
  tournamentId: string,
  categoryId: string,
  _prev: FormGroupsState,
  formData: FormData
): Promise<FormGroupsState> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", success: false };

  const rawGroupSize = Number(formData.get("groupSize"));
  const groupSize = Number.isInteger(rawGroupSize) && rawGroupSize >= 2 ? rawGroupSize : DEFAULT_GROUP_SIZE;

  try {
    await generateGroupsForCategory(categoryId, groupSize);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudieron formar los grupos. Intenta de nuevo.",
      success: false,
    };
  }

  revalidatePath(`/dashboard/torneos/${tournamentId}`);
  return { error: null, success: true };
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
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", success: false, unresolvedGroupConflicts: 0 };

  let unresolvedGroupConflicts = 0;
  try {
    const result = await generateBracketForCategory(categoryId);
    unresolvedGroupConflicts = result.unresolvedGroupConflicts;
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo generar el cuadro. Intenta de nuevo.",
      success: false,
      unresolvedGroupConflicts: 0,
    };
  }

  revalidatePath(`/dashboard/torneos/${tournamentId}`);
  return { error: null, success: true, unresolvedGroupConflicts };
}
