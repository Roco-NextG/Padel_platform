import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type PlayerRow = Database["public"]["Tables"]["players"]["Row"];
type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"];
type PlayerUpdate = Database["public"]["Tables"]["players"]["Update"];

export async function fetchPlayerByUserId(userId: string): Promise<PlayerRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function insertPlayer(input: PlayerInsert): Promise<PlayerRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("players").insert(input).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePlayer(id: string, patch: PlayerUpdate): Promise<PlayerRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
