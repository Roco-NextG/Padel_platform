import { createClient } from "@/lib/supabase/server";
import type { SignInInput, SignUpInput } from "../domain/schemas";

export async function signUpWithPassword(input: SignUpInput) {
  const supabase = await createClient();
  return supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      // gender/category survive here across the email-confirmation gap —
      // ensurePlayerProfile can't write the players row until there's a
      // session (see its own comment), and signInAction's repair path reads
      // them back from here, same as first_name/last_name already did.
      data: {
        first_name: input.firstName,
        last_name: input.lastName,
        gender: input.gender,
        category: input.category,
      },
    },
  });
}

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
