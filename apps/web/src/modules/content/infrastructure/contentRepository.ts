import { createClient } from "@/lib/supabase/server";
import { initialsFor, type ContentItem, type ContentTeam } from "../domain/content";

interface RawTeamMember {
  players: { first_name: string; last_name: string } | null;
}

function teamFromMembers(members: RawTeamMember[] | null | undefined): ContentTeam {
  const names = (members ?? [])
    .filter((m) => m.players)
    .map((m) => `${m.players!.first_name} ${m.players!.last_name}`.trim());
  const label = names.join(" / ") || "Por definir";
  return { label, initials: initialsFor(label) };
}

function dateKeyOf(iso: string): string {
  return iso.slice(0, 10);
}

function dateLabelOf(iso: string): string {
  return new Date(iso).toLocaleDateString("es-VE", { weekday: "short", day: "numeric", month: "short" }).toUpperCase();
}

function timeLabelOf(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
}

const CONTENT_MATCH_SELECT = `
  id, status, scheduled_start, actual_start, created_at, winner_team_id, court_id, team_a_id, team_b_id,
  tournament_phases(tournament_categories(name)),
  courts(name),
  team_a:teams!matches_team_a_id_fkey(team_members(players(first_name, last_name))),
  team_b:teams!matches_team_b_id_fkey(team_members(players(first_name, last_name))),
  set_scores(set_number, team_a_games, team_b_games)
`;

export interface ContentFeedData {
  tournamentName: string;
  sponsors: { id: string; name: string; logoUrl: string }[];
  items: ContentItem[];
}

export async function fetchContentFeed(tournamentId: string): Promise<ContentFeedData> {
  const supabase = await createClient();

  const [{ data: tournament, error: tournamentError }, { data: sponsors, error: sponsorsError }, { data: matches, error: matchesError }] =
    await Promise.all([
      supabase.from("tournaments").select("name").eq("id", tournamentId).single(),
      supabase.from("sponsors").select("id, name, logo_url").eq("tournament_id", tournamentId),
      supabase
        .from("matches")
        .select(CONTENT_MATCH_SELECT)
        .eq("tournament_id", tournamentId)
        .not("team_a_id", "is", null)
        .not("team_b_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
  if (tournamentError) throw new Error(tournamentError.message);
  if (sponsorsError) throw new Error(sponsorsError.message);
  if (matchesError) throw new Error(matchesError.message);

  const items: ContentItem[] = [];
  const resultsByDay = new Map<string, { teamA: string; teamB: string; score: string }[]>();
  const dayLabels = new Map<string, string>();

  for (const m of matches ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mm = m as any;
    const referenceTime: string = mm.actual_start ?? mm.scheduled_start ?? mm.created_at;
    const dateKey = dateKeyOf(referenceTime);
    const dateLabel = dateLabelOf(referenceTime);
    dayLabels.set(dateKey, dateLabel);

    const teamA = teamFromMembers(mm.team_a?.team_members);
    const teamB = teamFromMembers(mm.team_b?.team_members);
    const category = mm.tournament_phases?.tournament_categories?.name ?? "Sin categoría";
    const court = mm.courts?.name ?? null;
    const time = timeLabelOf(mm.actual_start ?? mm.scheduled_start);

    if (mm.status === "CONFIRMED" && mm.winner_team_id) {
      const sets: [number, number][] = (mm.set_scores ?? [])
        .sort((a: { set_number: number }, b: { set_number: number }) => a.set_number - b.set_number)
        .map((s: { team_a_games: number; team_b_games: number }) => [s.team_a_games, s.team_b_games] as [number, number]);
      const winner: "a" | "b" = mm.winner_team_id === mm.team_a_id ? "a" : "b";

      items.push({
        id: mm.id,
        type: "result",
        dateKey,
        dateLabel,
        court,
        time,
        category,
        teamA,
        teamB,
        sets,
        winner,
      });

      const scoreStr = sets.map(([a, b]) => `${a}-${b}`).join(" ");
      const list = resultsByDay.get(dateKey) ?? [];
      list.push({ teamA: teamA.label, teamB: teamB.label, score: scoreStr });
      resultsByDay.set(dateKey, list);
    } else if (mm.status === "SCHEDULED" || mm.status === "IN_PROGRESS") {
      items.push({
        id: mm.id,
        type: "upcoming",
        dateKey,
        dateLabel,
        court,
        time,
        category,
        teamA,
        teamB,
      });
    }
  }

  const summaries: ContentItem[] = [...resultsByDay.entries()].map(([dateKey, results]) => ({
    id: `summary-${dateKey}`,
    type: "summary" as const,
    dateKey,
    dateLabel: dayLabels.get(dateKey) ?? dateKey,
    results,
  }));

  return {
    tournamentName: tournament?.name ?? "?",
    sponsors: (sponsors ?? []).map((s) => ({ id: s.id, name: s.name, logoUrl: s.logo_url })),
    items: [...summaries, ...items],
  };
}
