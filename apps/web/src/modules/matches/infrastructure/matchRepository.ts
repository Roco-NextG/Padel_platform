import { createClient } from "@/lib/supabase/server";
import type { RatingEventOutput } from "@padel-platform/rating-engine";
import type { SetScoreInput } from "@padel-platform/match-engine";
import { resolveScoringConfig, type MatchListItem, type MatchTeamView } from "../domain/match";
import type { ClubSurfaceAccount } from "@/modules/shell/infrastructure/accountRepository";

interface RawTeamMember {
  players: { id: string; first_name: string; last_name: string } | null;
}

function toTeamView(teamId: string | null, members: RawTeamMember[] | null | undefined): MatchTeamView | null {
  if (!teamId) return null;
  return {
    teamId,
    players: (members ?? [])
      .filter((m) => m.players)
      .map((m) => ({ playerId: m.players!.id, firstName: m.players!.first_name, lastName: m.players!.last_name })),
  };
}

const MATCH_LIST_SELECT = `
  id, tournament_id, phase_id, group_id, court_id, status, scheduled_start,
  team_a_id, team_b_id, winner_team_id,
  tournaments(name, scoring_config),
  tournament_phases(type, category_id, tournament_categories(name)),
  tournament_groups(name),
  courts(name),
  team_a:teams!matches_team_a_id_fkey(id, team_members(players(id, first_name, last_name))),
  team_b:teams!matches_team_b_id_fkey(id, team_members(players(id, first_name, last_name)))
`;

/** Todos los partidos "activos" (no terminados) de los torneos que administra esta cuenta — cross-tournament, para la pantalla Partidos. */
export async function fetchManagedMatches(account: ClubSurfaceAccount): Promise<MatchListItem[]> {
  const supabase = await createClient();
  let tournamentQuery = supabase.from("tournaments").select("id");
  tournamentQuery =
    account.role === "Club"
      ? tournamentQuery.eq("club_id", account.clubId!).is("organizer_id", null)
      : tournamentQuery.eq("organizer_id", account.organizerId!);
  const { data: tournaments, error: tournamentsError } = await tournamentQuery;
  if (tournamentsError) throw new Error(tournamentsError.message);
  const tournamentIds = (tournaments ?? []).map((t) => t.id);
  if (tournamentIds.length === 0) return [];

  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_LIST_SELECT)
    .in("tournament_id", tournamentIds)
    .in("status", ["SCHEDULED", "IN_PROGRESS", "PENDING_CONFIRMATION", "DISPUTED"])
    .not("team_a_id", "is", null)
    .not("team_b_id", "is", null)
    .order("scheduled_start", { ascending: true, nullsFirst: false })
    .order("created_at");
  if (error) throw new Error(error.message);

  return mapMatchRows(data);
}

export async function fetchMatchesForCategory(categoryId: string): Promise<MatchListItem[]> {
  const supabase = await createClient();
  const { data: phases } = await supabase.from("tournament_phases").select("id").eq("category_id", categoryId);
  const phaseIds = (phases ?? []).map((p) => p.id);
  if (phaseIds.length === 0) return [];

  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_LIST_SELECT)
    .in("phase_id", phaseIds)
    .order("round_index");
  if (error) throw new Error(error.message);
  return mapMatchRows(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMatchRows(rows: any[] | null): MatchListItem[] {
  return (rows ?? []).map((m) => ({
    id: m.id,
    tournamentId: m.tournament_id,
    tournamentName: m.tournaments?.name ?? "?",
    categoryName: m.tournament_phases?.tournament_categories?.name ?? "?",
    phaseLabel: m.tournament_phases?.type ?? "?",
    groupName: m.tournament_groups?.name ?? null,
    courtId: m.court_id,
    courtName: m.courts?.name ?? null,
    status: m.status,
    scheduledStart: m.scheduled_start,
    teamA: toTeamView(m.team_a_id, m.team_a?.team_members),
    teamB: toTeamView(m.team_b_id, m.team_b?.team_members),
    winnerTeamId: m.winner_team_id,
    scoringConfig: resolveScoringConfig(m.tournaments?.scoring_config ?? {}),
  }));
}

export interface MatchRatingContext {
  tournamentId: string;
  categoryId: string | null;
  matchType: "TOURNAMENT" | "COMPETITIVE" | "CASUAL";
  teamAId: string;
  teamBId: string;
  teamAPlayers: { playerId: string; rating: number | null; ratingDeviation: number | null }[];
  teamBPlayers: { playerId: string; rating: number | null; ratingDeviation: number | null }[];
}

export async function fetchMatchRatingContext(matchId: string): Promise<MatchRatingContext | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      `id, tournament_id, match_type, team_a_id, team_b_id,
       tournament_phases(category_id),
       team_a:teams!matches_team_a_id_fkey(team_members(players(id, current_rating, current_rating_deviation))),
       team_b:teams!matches_team_b_id_fkey(team_members(players(id, current_rating, current_rating_deviation)))`
    )
    .eq("id", matchId)
    .single();
  if (error) throw new Error(error.message);
  if (!data.team_a_id || !data.team_b_id) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extract = (team: any) =>
    ((team?.team_members ?? []) as { players: { id: string; current_rating: number | null; current_rating_deviation: number | null } | null }[])
      .filter((m) => m.players)
      .map((m) => ({
        playerId: m.players!.id,
        rating: m.players!.current_rating,
        ratingDeviation: m.players!.current_rating_deviation,
      }));

  return {
    tournamentId: data.tournament_id!,
    categoryId: (data.tournament_phases as unknown as { category_id: string } | null)?.category_id ?? null,
    matchType: data.match_type,
    teamAId: data.team_a_id,
    teamBId: data.team_b_id,
    teamAPlayers: extract(data.team_a),
    teamBPlayers: extract(data.team_b),
  };
}

export async function submitResult(matchId: string, sets: SetScoreInput[], winner: "A" | "B"): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_match_result", {
    p_match_id: matchId,
    p_sets: sets.map((s) => ({ setNumber: s.setNumber, teamAGames: s.teamAGames, teamBGames: s.teamBGames, tiebreakA: s.tiebreakA ?? null, tiebreakB: s.tiebreakB ?? null })),
    p_winner: winner,
    p_by_organizer: true,
  });
  if (error) throw new Error(error.message);
}

export async function recordRatingEvents(events: RatingEventOutput[]): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_rating_events", { p_events: events });
  if (error) throw new Error(error.message);
}

export async function setMatchCourt(matchId: string, courtId: string | null): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("matches").update({ court_id: courtId }).eq("id", matchId);
  if (error) throw new Error(error.message);
}

export async function setMatchInProgress(matchId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("matches").update({ status: "IN_PROGRESS", actual_start: new Date().toISOString() }).eq("id", matchId);
  if (error) throw new Error(error.message);
}
