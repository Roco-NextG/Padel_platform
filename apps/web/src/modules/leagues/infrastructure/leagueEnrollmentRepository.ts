import { createClient } from "@/lib/supabase/server";
import type { PlayerSearchResult, TeamWithPlayers } from "@/modules/tournaments/domain/enrollment";

// createPlayerForEnrollment/getPlayersByIds/assignPlayerCategory (enrollmentRepository.ts,
// tournaments) ya son genéricas — sus RPCs (0015) están gateadas por
// is_tournament_staff(), que no depende de un torneo puntual — se reutilizan
// tal cual, sin ninguna versión propia para Liga.
export { createPlayerForEnrollment, getPlayersByIds, assignPlayerCategory, removeTeam } from "@/modules/tournaments/infrastructure/enrollmentRepository";

export async function searchPlayersForLeague(leagueId: string, query: string): Promise<PlayerSearchResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_players_for_league_enrollment", {
    p_league_id: leagueId,
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

export async function fetchTeamsForLeagueCategory(categoryId: string): Promise<TeamWithPlayers[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, team_members(player_id, players(id, first_name, last_name))")
    .eq("league_category_id", categoryId)
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

export async function createLeagueTeam(categoryId: string, playerIds: [string, string]): Promise<string> {
  const supabase = await createClient();
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({ league_category_id: categoryId })
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
