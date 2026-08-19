import { createClient } from "@/lib/supabase/server";
import type { Database, EnrollmentPlayerResult, GenderType } from "@/lib/supabase/database.types";

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

/**
 * Búsqueda para el paso 4 de Crear Torneo — no es una query directa contra
 * `players` (esa tabla no deja ver jugadores ajenos vía RLS), es la RPC
 * `search_players_for_enrollment` (0021), que además puede leer
 * `auth.users.email` — algo que ningún query de cliente puede hacer nunca.
 */
export async function searchPlayersForEnrollment(query: string): Promise<EnrollmentPlayerResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_players_for_enrollment", { p_query: query });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Alta manual "sin salir del flujo" (paso 4) — RPC `create_player_for_enrollment` (0021), user_id queda NULL (jugador importado, sin cuenta). */
export async function createPlayerForEnrollment(input: {
  firstName: string;
  lastName: string;
  gender: GenderType;
  category: number;
}): Promise<PlayerRow> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_player_for_enrollment", {
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_gender: input.gender,
    p_category: input.category,
  });
  if (error) throw new Error(error.message);
  return data;
}

/** Re-lee gender/category directo de la base para revalidar la certificación server-side antes del INSERT en Team — nunca confía en lo que mandó el cliente (docs/11_UX_HANDOFF.md §4 #9). */
export async function fetchPlayersByIds(
  playerIds: string[]
): Promise<Map<string, { gender: GenderType | null; category: number | null }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_players_by_ids", { p_player_ids: playerIds });
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((p) => [p.player_id, { gender: p.gender, category: p.category }]));
}

/** Rellena una category faltante encontrada en la búsqueda — RPC `assign_player_category` (0021), rechaza si ya tenía una. */
export async function assignPlayerCategory(playerId: string, category: number): Promise<PlayerRow> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("assign_player_category", {
    p_player_id: playerId,
    p_category: category,
  });
  if (error) throw new Error(error.message);
  return data;
}
