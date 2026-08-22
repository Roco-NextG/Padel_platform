"use server";

import { redirect } from "next/navigation";
import { signInSchema } from "../domain/schemas";
import { signInWithPassword, signOutUser, touchAccountActivity } from "../infrastructure/authRepository";
import { homePathForRoles } from "../domain/roles";
import { translateAuthError } from "../domain/authErrors";
import { getCurrentUserContext } from "./getCurrentUserContext";

export interface AuthActionState {
  error: string | null;
  values?: {
    email?: string;
  };
}

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const parsed = signInSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos ingresados.", values: { email } };
  }

  const { data, error } = await signInWithPassword(parsed.data);
  if (error) {
    return { error: translateAuthError(error), values: { email } };
  }
  if (!data.user) {
    return { error: "No se pudo iniciar sesión. Intenta de nuevo.", values: { email } };
  }

  await touchAccountActivity(data.user.id);

  const context = await getCurrentUserContext();
  redirect(context ? homePathForRoles(context.roles) : "/login");
}

export async function signOutAction() {
  await signOutUser();
  redirect("/login");
}
