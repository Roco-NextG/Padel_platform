"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setPasswordSchema } from "../domain/schemas";
import { translateAuthError } from "@/modules/auth/domain/authErrors";

export interface SetPasswordState {
  error: string | null;
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
