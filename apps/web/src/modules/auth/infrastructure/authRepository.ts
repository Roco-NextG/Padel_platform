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
