"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setPasswordSchema } from "../domain/schemas";
import { translateAuthError } from "@/modules/auth/domain/authErrors";

export interface SetPasswordState {
  error: string | null;
}

export interface ConfirmInviteState {
  error: string | null;
}

/**
 * Canjea el `code` del link de invitación por una sesión — a propósito
 * solo se llama desde un botón (ver confirm-invite-form.tsx), nunca desde
 * un GET automático, para no perder el code ante un pre-fetch de scanner
 * de email (ver auth/callback/route.ts).
 */
export async function confirmInviteAction(
  _prev: ConfirmInviteState,
  formData: FormData
): Promise<ConfirmInviteState> {
  const code = formData.get("code");
  const next = (formData.get("next") as string) || "/invitacion";

  if (typeof code !== "string" || !code) {
    return { error: "El link de invitación no es válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return { error: "El link de invitación venció o ya fue usado. Pídele al admin que te reenvíe una invitación nueva." };
  }

  redirect(next);
}

/** El invitado ya tiene sesión (creada por /auth/callback al canjear el link de Supabase) — esto solo fija la contraseña y adjunta el role_assignment vía redeem_invite() (0004_invite_rpc.sql). */
export async function setPasswordAction(
  _prev: SetPasswordState,
  formData: FormData
): Promise<SetPasswordState> {
  const parsed = setPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa la contraseña ingresada." };
  }

  const supabase = await createClient();

  const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (updateError) {
    return { error: translateAuthError(updateError) };
  }

  const { error: redeemError } = await supabase.rpc("redeem_invite");
  if (redeemError) {
    return { error: "No se pudo activar tu invitación. Contacta al administrador." };
  }

  redirect("/bienvenida");
}
