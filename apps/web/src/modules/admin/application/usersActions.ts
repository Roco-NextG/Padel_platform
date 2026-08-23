"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAccountSchema } from "../domain/createAccount";
import {
  changeAccountPlan,
  createAccountWithInvite,
  deleteAccount,
  makeAdmin,
  revokeAdmin,
  setAccountActive,
  type PlatformAccountType,
} from "../infrastructure/usersRepository";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { isAdmin } from "@/modules/auth/domain/roles";

export interface SimpleActionState {
  error: string | null;
}

export interface CreateUserActionState {
  error: string | null;
}

async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const context = await getCurrentUserContext();
  if (!context) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  if (!isAdmin(context.roles)) return { error: "No tienes permisos de administrador." };
  return { userId: context.userId };
}

export async function createUserAction(
  _prev: CreateUserActionState,
  formData: FormData
): Promise<CreateUserActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const tipoUsuario = formData.get("tipoUsuario");
  const raw: Record<string, unknown> = {
    tipoUsuario,
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  };
  if (tipoUsuario === "CLUB" || tipoUsuario === "ORGANIZADOR") {
    raw.planId = formData.get("planId") || null;
  }
  // El Organizador es solo una persona — sin datos de entidad propios,
  // a diferencia del Club (ver create-user-form.tsx y createAccountWithInvite).
  if (tipoUsuario === "CLUB") {
    raw.entityName = formData.get("entityName");
    raw.entityCity = formData.get("entityCity") || undefined;
    raw.entityContactEmail = formData.get("entityContactEmail") || "";
  }

  const parsed = createAccountSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos ingresados." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    await createAccountWithInvite(parsed.data, auth.userId, `${siteUrl}/auth/callback?next=/invitacion`);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear la cuenta." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/invitaciones");
  redirect("/admin/usuarios?created=1");
}

export async function makeAdminAction(userId: string): Promise<SimpleActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  try {
    await makeAdmin(userId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo otorgar el rol de admin." };
  }

  revalidatePath("/admin/usuarios");
  return { error: null };
}

export async function revokeAdminAction(userId: string): Promise<SimpleActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };
  if (auth.userId === userId) {
    return { error: "No podés revocarte el rol de admin a vos mismo — pedile a otro admin que lo haga." };
  }

  try {
    await revokeAdmin(userId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo revocar el rol de admin." };
  }

  revalidatePath("/admin/usuarios");
  return { error: null };
}

export async function deleteUserAction(
  accountType: PlatformAccountType,
  entityId: string,
  userId: string | null
): Promise<SimpleActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  try {
    await deleteAccount(accountType, entityId, userId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo borrar la cuenta." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  return { error: null };
}

export async function setAccountActiveAction(
  accountType: PlatformAccountType,
  entityId: string,
  userId: string | null,
  active: boolean
): Promise<SimpleActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  try {
    await setAccountActive(accountType, entityId, userId, active);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo actualizar la cuenta." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  return { error: null };
}

export async function changePlanAction(
  accountType: "CLUB" | "ORGANIZADOR",
  entityId: string,
  planId: string | null
): Promise<SimpleActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  try {
    await changeAccountPlan(accountType, entityId, planId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo cambiar el plan." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/suscripciones/activas");
  return { error: null };
}
