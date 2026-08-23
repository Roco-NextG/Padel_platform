import { createClient } from "@/lib/supabase/server";
import type { GenderType } from "@/lib/supabase/database.types";
import type { PlayerSearchResult, TeamWithPlayers } from "../domain/enrollment";

export async function searchPlayers(tournamentId: string, query: string): Promise<PlayerSearchResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_players_for_enrollment", {
    p_tournament_id: tournamentId,
    p_query: query,
  });
  if (error) throw new Error(error.message);

  return (data ?? []).map((p) => ({
    playerId: p.player_id,
    firstName: p.first_name,
    lastName: p.last_name,
    email: p.email,
    gender: p.gender,
    category: p.category,
  }));
}

export async function createPlayerForEnrollment(
  firstName: string,
  lastName: string,
  gender: GenderType,
  category: number
): Promise<PlayerSearchResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_player_for_enrollment", {
    p_first_name: firstName,
    p_last_name: lastName,
    p_gender: gender,
    p_category: category,
  });
  if (error) throw new Error(error.message);

  return {
    playerId: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: null,
    gender: data.gender,
    category: data.category,
  };
}

export async function getPlayersByIds(playerIds: string[]): Promise<{ playerId: string; gender: GenderType | null; category: number | null }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_players_by_ids", { p_player_ids: playerIds });
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({ playerId: p.player_id, gender: p.gender, category: p.category }));
}

export async function assignPlayerCategory(playerId: string, category: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_player_category", { p_player_id: playerId, p_category: category });
  if (error) throw new Error(error.message);
}

export async function fetchTeamsForCategory(categoryId: string): Promise<TeamWithPlayers[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, team_members(player_id, players(id, first_name, last_name))")
    .eq("tournament_category_id", categoryId)
    .order("created_at");
  if (error) throw new Error(error.message);

  return (data ?? []).map((t) => ({
    teamId: t.id,
    players: (t.team_members as unknown as { players: { id: string; first_name: string; last_name: string } | null }[]).map((m) => ({
      playerId: m.players?.id ?? "",
      firstName: m.players?.first_name ?? "?",
      lastName: m.players?.last_name ?? "",
    })),
  }));
}

export async function createTeam(categoryId: string, playerIds: [string, string]): Promise<string> {
  const supabase = await createClient();
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({ tournament_category_id: categoryId })
    .select("id")
    .single();
  if (teamError) throw new Error(teamError.message);

  const { error: membersError } = await supabase
    .from("team_members")
    .insert(playerIds.map((playerId) => ({ team_id: team.id, player_id: playerId })));
  if (membersError) {
    await supabase.from("teams").delete().eq("id", team.id);
    throw new Error(membersError.message);
  }

  return team.id;
}

export async function removeTeam(teamId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) throw new Error(error.message);
}
