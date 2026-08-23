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

/** Solo rutas internas ("/algo") — nunca "//algo" (host-relative, abre la puerta a redirigir a otro dominio) ni una URL absoluta. */
function isSafeInternalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
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

  // Si el login vino de un "next" explícito (ej. el link "Ver panel de
  // usuario" del sidebar de admin, que bota a /login si no hay sesión
  // activa), respetarlo — solo caer al home por rol cuando no hay uno.
  const next = String(formData.get("next") ?? "");
  if (next && isSafeInternalPath(next)) {
    redirect(next);
  }

  const context = await getCurrentUserContext();
  redirect(context ? homePathForRoles(context.roles) : "/login");
}

export async function signOutAction() {
  await signOutUser();
  redirect("/login");
}
