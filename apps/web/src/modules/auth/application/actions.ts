"use server";

import { redirect } from "next/navigation";
import { signInSchema, signUpSchema } from "../domain/schemas";
import { signInWithPassword, signOutUser, signUpWithPassword } from "../infrastructure/authRepository";
import { belongsOnClubSurface } from "../domain/roles";
import { ensurePlayerProfile } from "./ensurePlayerProfile";
import { getCurrentUserContext } from "./getCurrentUserContext";

export interface AuthActionState {
  error: string | null;
  values?: { firstName?: string; lastName?: string; email?: string };
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const raw = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: formData.get("password"),
  };
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Revisa los datos ingresados.",
      values: raw,
    };
  }

  const { data, error } = await signUpWithPassword(parsed.data);
  if (error) {
    return { error: translateAuthError(error.message), values: raw };
  }
  if (!data.user) {
    return { error: "No se pudo crear la cuenta. Intenta de nuevo.", values: raw };
  }

  // Sin sesión = Supabase exige confirmar el email antes de continuar.
  if (!data.session) {
    redirect("/registro/revisa-tu-email");
  }

  await ensurePlayerProfile(data.user.id, {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
  });

  redirect("/");
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
    return { error: translateAuthError(error.message), values: { email } };
  }
  if (!data.user) {
    return { error: "No se pudo iniciar sesión. Intenta de nuevo.", values: { email } };
  }

  const meta = data.user.user_metadata as { first_name?: string; last_name?: string };
  await ensurePlayerProfile(data.user.id, {
    firstName: meta?.first_name,
    lastName: meta?.last_name,
  });

  const context = await getCurrentUserContext();
  redirect(context && belongsOnClubSurface(context.roles) ? "/dashboard" : "/");
}

export async function signOutAction() {
  await signOutUser();
  redirect("/login");
}

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) return "Email o contraseña incorrectos.";
  if (message.includes("User already registered")) return "Ya existe una cuenta con este email.";
  if (message.includes("Password should be at least")) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  return "Ocurrió un error. Intenta de nuevo.";
}
