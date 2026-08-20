"use server";

import { revalidatePath } from "next/cache";
import { inviteSchema } from "../domain/invite";
import { createAccountAndInvite, revokeInvite, setAccountActive } from "../infrastructure/adminRepository";
import type { AppRole } from "@/lib/supabase/database.types";
import { fetchAuthenticatedUser } from "@/modules/auth/infrastructure/authRepository";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { isAdmin } from "@/modules/auth/domain/roles";

export interface AdminActionState {
  error: string | null;
  success: boolean;
}

export interface SimpleActionState {
  error: string | null;
}

async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const context = await getCurrentUserContext();
  if (!context) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  if (!isAdmin(context.roles)) return { error: "No tienes permisos de administrador." };
  return { userId: context.userId };
}

export async function inviteAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error, success: false };

  const parsed = inviteSchema.safeParse({
    role: formData.get("role"),
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos ingresados.", success: false };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    await createAccountAndInvite({
      role: parsed.data.role,
      name: parsed.data.name,
      email: parsed.data.email,
      invitedBy: auth.userId,
      redirectTo: `${siteUrl}/auth/callback?next=/invitacion`,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo enviar la invitación.", success: false };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/invitaciones");
  return { error: null, success: true };
}

export async function setAccountActiveAction(
  userId: string,
  role: AppRole,
  scopeId: string | null,
  active: boolean
): Promise<SimpleActionState> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  try {
    await setAccountActive({ userId, role, scopeId, active });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo actualizar la cuenta." };
  }

  revalidatePath("/admin");
  return { error: null };
}

export async function revokeInviteAction(inviteId: string): Promise<SimpleActionState> {
  const { user } = await fetchAuthenticatedUser();
  if (!user) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };

  try {
    await revokeInvite(inviteId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo revocar la invitación." };
  }

  revalidatePath("/admin/invitaciones");
  return { error: null };
}
