"use server";

import { redirect } from "next/navigation";
import { isAuthApiError } from "@supabase/supabase-js";
import type { GenderType } from "@/lib/supabase/database.types";
import { signInSchema, signUpSchema } from "../domain/schemas";
import { signInWithPassword, signOutUser, signUpWithPassword } from "../infrastructure/authRepository";
import { belongsOnClubSurface } from "../domain/roles";
import { ensurePlayerProfile } from "./ensurePlayerProfile";
import { getCurrentUserContext } from "./getCurrentUserContext";

export interface AuthActionState {
  error: string | null;
  values?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    gender?: string;
    category?: string;
  };
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
    gender: String(formData.get("gender") ?? ""),
    category: String(formData.get("category") ?? ""),
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
    return { error: translateAuthError(error), values: raw };
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
    gender: parsed.data.gender,
    category: parsed.data.category,
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
    return { error: translateAuthError(error), values: { email } };
  }
  if (!data.user) {
    return { error: "No se pudo iniciar sesión. Intenta de nuevo.", values: { email } };
  }

  const meta = data.user.user_metadata as {
    first_name?: string;
    last_name?: string;
    gender?: GenderType;
    category?: number;
  };
  await ensurePlayerProfile(data.user.id, {
    firstName: meta?.first_name,
    lastName: meta?.last_name,
    gender: meta?.gender,
    category: meta?.category,
  });

  const context = await getCurrentUserContext();
  redirect(context && belongsOnClubSurface(context.roles) ? "/dashboard" : "/");
}

export async function signOutAction() {
  await signOutUser();
  redirect("/login");
}

/**
 * Supabase's auth-js attaches a stable `code` (e.g. "email_address_invalid",
 * "over_email_send_rate_limit") to every AuthApiError — matching on that is
 * reliable across SDK/locale versions, unlike substring-matching `.message`.
 * Full list: node_modules/@supabase/auth-js/src/lib/error-codes.ts.
 */
function translateAuthError(error: unknown): string {
  const code = isAuthApiError(error) ? error.code : undefined;

  switch (code) {
    case "invalid_credentials":
      return "Email o contraseña incorrectos.";
    case "user_already_exists":
    case "email_exists":
      return "Ya existe una cuenta con este email.";
    case "weak_password":
      return "La contraseña debe tener al menos 8 caracteres.";
    case "email_address_invalid":
      return "Ese email no es válido. Revisa que esté bien escrito.";
    case "email_address_not_authorized":
      return "Este email no está autorizado para registrarse todavía.";
    case "over_email_send_rate_limit":
      return "Se enviaron demasiados emails en poco tiempo. Espera unos minutos e intenta de nuevo.";
    case "over_request_rate_limit":
      return "Demasiados intentos. Espera un momento e intenta de nuevo.";
    case "signup_disabled":
    case "email_provider_disabled":
      return "El registro no está habilitado todavía. Contacta al administrador.";
    case "user_banned":
      return "Esta cuenta fue suspendida.";
    default:
      return "Ocurrió un error. Intenta de nuevo.";
  }
}
