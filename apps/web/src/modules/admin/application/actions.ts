"use server";

import { revalidatePath } from "next/cache";
import { fetchAuthenticatedUser } from "@/modules/auth/infrastructure/authRepository";
import type { AppRole } from "@/lib/supabase/database.types";
import { grantRole, revokeRole } from "../infrastructure/adminRepository";

export interface GrantRoleState {
  error: string | null;
  success: boolean;
}

/**
 * La autorización real la impone la RPC (`admin_grant_role`, is_admin()) —
 * este chequeo de sesión solo evita una llamada innecesaria y da un mensaje
 * más claro que el error crudo de Postgres.
 */
export async function grantRoleAction(
  userId: string,
  _prev: GrantRoleState,
  formData: FormData
): Promise<GrantRoleState> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", success: false };

  const role = formData.get("role") as AppRole;
  const clubId = (formData.get("clubId") as string) || null;
  const organizerId = (formData.get("organizerId") as string) || null;

  try {
    await grantRole({ userId, role, clubId, organizerId });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo otorgar el rol. Intenta de nuevo.",
      success: false,
    };
  }

  revalidatePath("/dashboard/admin");
  return { error: null, success: true };
}

export interface RevokeRoleState {
  error: string | null;
  success: boolean;
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export async function revokeRoleAction(
  roleId: string,
  _prev: RevokeRoleState,
  _formData: FormData
): Promise<RevokeRoleState> {
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", success: false };

  try {
    await revokeRole(roleId);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo revocar el rol. Intenta de nuevo.",
      success: false,
    };
  }

  revalidatePath("/dashboard/admin");
  return { error: null, success: true };
}
