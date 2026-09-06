import { createClient } from "@/lib/supabase/server";
import type { CreateLeagueInput, League, UpdateLeagueInput } from "../domain/league";
import type { LeagueCategory } from "../domain/leagueCategory";
import { categoryName } from "@/modules/tournaments/domain/category";
import type { ClubSurfaceAccount } from "@/modules/shell/infrastructure/accountRepository";
import { DEFAULT_TIME_ZONE } from "@/lib/timezone";

/** Mismo criterio de scoping que fetchMyTournaments (tournamentRepository.ts). */
export async function fetchMyLeagues(account: ClubSurfaceAccount): Promise<League[]> {
  const supabase = await createClient();
  let query = supabase
    .from("leagues")
    .select(
      "id, name, description, club_id, organizer_id, is_published, start_date, end_date, created_at, logo_url, cover_image_url, clubs(name, time_zone)"
    )
    .order("created_at", { ascending: false });

  query = account.role === "Club" ? query.eq("club_id", account.clubId!).is("organizer_id", null) : query.eq("organizer_id", account.organizerId!);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const leagueIds = (data ?? []).map((l) => l.id);
  const { data: categories } = leagueIds.length
    ? await supabase.from("league_categories").select("id, league_id").in("league_id", leagueIds)
    : { data: [] };
  const categoryCountByLeague = new Map<string, number>();
  const leagueIdByCategoryId = new Map<string, string>();
  for (const c of categories ?? []) {
    categoryCountByLeague.set(c.league_id, (categoryCountByLeague.get(c.league_id) ?? 0) + 1);
    leagueIdByCategoryId.set(c.id, c.league_id);
  }

  const categoryIds = (categories ?? []).map((c) => c.id);
  const { data: teams } = categoryIds.length
    ? await supabase.from("teams").select("id, league_category_id").in("league_category_id", categoryIds)
    : { data: [] };
  const teamCountByLeague = new Map<string, number>();
  for (const t of teams ?? []) {
    if (!t.league_category_id) continue;
    const leagueId = leagueIdByCategoryId.get(t.league_category_id);
    if (!leagueId) continue;
    teamCountByLeague.set(leagueId, (teamCountByLeague.get(leagueId) ?? 0) + 1);
  }

  return (data ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    description: l.description,
    clubId: l.club_id,
    clubName: (l.clubs as unknown as { name: string } | null)?.name ?? "?",
    clubTimeZone: (l.clubs as unknown as { time_zone: string } | null)?.time_zone ?? DEFAULT_TIME_ZONE,
    organizerId: l.organizer_id,
    isPublished: l.is_published,
    startDate: l.start_date,
    endDate: l.end_date,
    categoryCount: categoryCountByLeague.get(l.id) ?? 0,
    teamCount: teamCountByLeague.get(l.id) ?? 0,
    createdAt: l.created_at,
    logoUrl: l.logo_url,
    coverImageUrl: l.cover_image_url,
  }));
}

export async function fetchLeagueById(leagueId: string): Promise<League | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leagues")
    .select(
      "id, name, description, club_id, organizer_id, is_published, start_date, end_date, created_at, logo_url, cover_image_url, clubs(name, time_zone)"
    )
    .eq("id", leagueId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    clubId: data.club_id,
    clubName: (data.clubs as unknown as { name: string } | null)?.name ?? "?",
    clubTimeZone: (data.clubs as unknown as { time_zone: string } | null)?.time_zone ?? DEFAULT_TIME_ZONE,
    organizerId: data.organizer_id,
    isPublished: data.is_published,
    startDate: data.start_date,
    endDate: data.end_date,
    categoryCount: 0,
    teamCount: 0,
    createdAt: data.created_at,
    logoUrl: data.logo_url,
    coverImageUrl: data.cover_image_url,
  };
}

/**
 * Mismo motivo que createTournament (tournamentRepository.ts): leagues_select
 * llama is_league_manager(id), que vuelve a consultar leagues — encadenar
 * .select() sobre el INSERT dispara esa lectura dentro del mismo statement y
 * la fila recién insertada "no existe todavía" para RLS, así que el insert
 * completo falla. El id se genera acá para evitar ese problema.
 */
export async function createLeague(account: ClubSurfaceAccount, input: CreateLeagueInput): Promise<string> {
  const supabase = await createClient();
  const clubId = account.role === "Club" ? account.clubId! : input.hostClubId!;
  const id = crypto.randomUUID();

  const { error } = await supabase.from("leagues").insert({
    id,
    name: input.name,
    description: input.description || null,
    club_id: clubId,
    organizer_id: account.role === "Organizador" ? account.organizerId : null,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
  });
  if (error) throw new Error(error.message);
  return id;
}

export async function updateLeague(leagueId: string, input: UpdateLeagueInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("leagues")
    .update({
      name: input.name,
      description: input.description || null,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
    })
    .eq("id", leagueId);
  if (error) throw new Error(error.message);
}

export async function fetchLeagueCategories(leagueId: string): Promise<LeagueCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("league_categories")
    .select("id, league_id, name, level, gender_restriction")
    .eq("league_id", leagueId)
    .order("level");
  if (error) throw new Error(error.message);

  return (data ?? []).map((c) => ({
    id: c.id,
    leagueId: c.league_id,
    name: c.name,
    level: c.level ?? "",
    genderRestriction: c.gender_restriction ?? "MIXED",
  }));
}

export async function addLeagueCategory(leagueId: string, level: number, gender: "MALE" | "FEMALE" | "MIXED"): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("league_categories")
    .insert({
      league_id: leagueId,
      name: categoryName(level, gender),
      level: String(level),
      gender_restriction: gender,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function removeLeagueCategory(categoryId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("league_categories").delete().eq("id", categoryId);
  if (error) throw new Error(error.message);
}

export async function setLeaguePublished(leagueId: string, published: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("leagues").update({ is_published: published }).eq("id", leagueId);
  if (error) throw new Error(error.message);
}

/** Reutiliza el bucket 'tournament-branding' (0023) bajo un prefijo `league-<id>/` — su policy de escritura ya es genérica (is_tournament_staff()), no hace falta un bucket propio. */
async function uploadLeagueBranding(leagueId: string, file: File, prefix: "logo" | "cover"): Promise<string> {
  const supabase = await createClient();
  const ext = file.name.split(".").pop() ?? "png";
  const path = `league-${leagueId}/${prefix}-${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("tournament-branding").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from("tournament-branding").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadLeagueLogo(leagueId: string, file: File): Promise<string> {
  const url = await uploadLeagueBranding(leagueId, file, "logo");
  const supabase = await createClient();
  const { error } = await supabase.from("leagues").update({ logo_url: url }).eq("id", leagueId);
  if (error) throw new Error(error.message);
  return url;
}

export async function uploadLeagueCoverImage(leagueId: string, file: File): Promise<string> {
  const url = await uploadLeagueBranding(leagueId, file, "cover");
  const supabase = await createClient();
  const { error } = await supabase.from("leagues").update({ cover_image_url: url }).eq("id", leagueId);
  if (error) throw new Error(error.message);
  return url;
}
