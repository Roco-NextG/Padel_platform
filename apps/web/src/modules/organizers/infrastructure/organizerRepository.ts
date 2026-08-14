import { createClient } from "@/lib/supabase/server";
import type { Database, OrganizerType } from "@/lib/supabase/database.types";

type OrganizerRow = Database["public"]["Tables"]["organizers"]["Row"];

export async function fetchOrganizerByUserId(userId: string): Promise<OrganizerRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function insertOrganizer(input: {
  userId: string;
  name: string;
  type: OrganizerType;
}): Promise<OrganizerRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizers")
    .insert({ user_id: input.userId, name: input.name, type: input.type })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateOrganizer(
  id: string,
  patch: { name: string; type: OrganizerType }
): Promise<OrganizerRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizers")
    .update({ name: patch.name, type: patch.type })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
