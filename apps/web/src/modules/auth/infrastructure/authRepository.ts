import { createClient } from "@/lib/supabase/server";
import type { SignInInput } from "../domain/schemas";

export async function signInWithPassword(input: SignInInput) {
  const supabase = await createClient();
  return supabase.auth.signInWithPassword(input);
}

export async function signOutUser() {
  const supabase = await createClient();
  return supabase.auth.signOut();
}

export async function fetchAuthenticatedUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
}

/** "Última vez que usó la app" — se actualiza solo en sign-in, no en cada request (account_activity_rw permite que cada cuenta escriba su propia fila). */
export async function touchAccountActivity(userId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("account_activity").upsert({ user_id: userId, last_active_at: new Date().toISOString() });
}
