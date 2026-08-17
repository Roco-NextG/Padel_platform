import { createClient } from "@/lib/supabase/server";
import type { ClubBranding, NearbyTournamentResult } from "@/lib/supabase/database.types";

/** Directo vía RLS (`tournaments_select`, is_published = true ya cubre esto) — no hace falta RPC ni sesión. */
export async function fetchNearbyTournaments(
  lat: number,
  lng: number,
  limit = 50
): Promise<NearbyTournamentResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("nearby_published_tournaments", {
    p_lat: lat,
    p_lng: lng,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface DiscoveryTournamentRow {
  tournamentId: string;
  name: string;
  startDate: string | null;
  coverImageUrl: string | null;
  entryFee: number | null;
  entryFeeCurrency: string | null;
  clubId: string;
  clubName: string;
  clubLogoUrl: string | null;
  clubCity: string | null;
}

interface PublishedTournamentWithClub {
  row: DiscoveryTournamentRow;
  hasClubGeo: boolean;
}

async function fetchPublishedTournamentsWithClubs(): Promise<PublishedTournamentWithClub[]> {
  const supabase = await createClient();
  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("id, name, start_date, cover_image_url, entry_fee, entry_fee_currency, club_id")
    .eq("is_published", true)
    .order("start_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  if (!tournaments || tournaments.length === 0) return [];

  const clubIds = Array.from(new Set(tournaments.map((t) => t.club_id)));
  const { data: clubs, error: clubsError } = await supabase
    .from("clubs")
    .select("id, name, branding, city, latitude, longitude")
    .in("id", clubIds);
  if (clubsError) throw new Error(clubsError.message);
  const clubById = new Map((clubs ?? []).map((c) => [c.id, c]));

  return tournaments
    .map((t) => ({ t, club: clubById.get(t.club_id) }))
    .filter((x): x is { t: (typeof tournaments)[number]; club: NonNullable<typeof x.club> } => x.club != null)
    .map(({ t, club }) => ({
      row: {
        tournamentId: t.id,
        name: t.name,
        startDate: t.start_date,
        coverImageUrl: t.cover_image_url,
        entryFee: t.entry_fee,
        entryFeeCurrency: t.entry_fee_currency,
        clubId: club.id,
        clubName: club.name,
        clubLogoUrl: (club.branding as ClubBranding | null)?.logo_url ?? null,
        clubCity: club.city,
      },
      hasClubGeo: club.latitude != null && club.longitude != null,
    }));
}

/** nearby_published_tournaments excluye a propósito los torneos cuyo club no tiene lat/lng (ver comment de la función, 0017) — estos se listan aparte. */
export async function fetchUngeolocatedPublishedTournaments(): Promise<DiscoveryTournamentRow[]> {
  const rows = await fetchPublishedTournamentsWithClubs();
  return rows.filter((r) => !r.hasClubGeo).map((r) => r.row);
}

/** Todos los torneos publicados (con o sin club geolocalizado), ordenados por fecha — fallback cuando el navegador no da ubicación. */
export async function fetchAllPublishedTournaments(): Promise<DiscoveryTournamentRow[]> {
  const rows = await fetchPublishedTournamentsWithClubs();
  return rows.map((r) => r.row);
}

export async function fetchCategoryNamesByTournament(
  tournamentIds: string[]
): Promise<Map<string, string[]>> {
  if (tournamentIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_categories")
    .select("tournament_id, name")
    .in("tournament_id", tournamentIds);
  if (error) throw new Error(error.message);

  const map = new Map<string, string[]>();
  for (const c of data ?? []) {
    const list = map.get(c.tournament_id) ?? [];
    list.push(c.name);
    map.set(c.tournament_id, list);
  }
  return map;
}

export interface TournamentDiscoveryDetail {
  tournamentId: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  coverImageUrl: string | null;
  entryFee: number | null;
  entryFeeCurrency: string | null;
  clubName: string;
  clubLogoUrl: string | null;
  clubCity: string | null;
  categories: string[];
}

/** `is_published = true` va directo en la consulta (no como chequeo posterior) para que la vista pública se comporte igual esté o no logueado el visitante como manager de ese torneo. */
export async function fetchTournamentDiscoveryDetail(
  tournamentId: string
): Promise<TournamentDiscoveryDetail | null> {
  const supabase = await createClient();
  const { data: tournament, error } = await supabase
    .from("tournaments")
    .select("id, name, description, start_date, end_date, cover_image_url, entry_fee, entry_fee_currency, club_id")
    .eq("id", tournamentId)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!tournament) return null;

  const [{ data: club, error: clubError }, categories] = await Promise.all([
    supabase.from("clubs").select("name, branding, city").eq("id", tournament.club_id).maybeSingle(),
    fetchCategoryNamesByTournament([tournamentId]),
  ]);
  if (clubError) throw new Error(clubError.message);

  return {
    tournamentId: tournament.id,
    name: tournament.name,
    description: tournament.description,
    startDate: tournament.start_date,
    endDate: tournament.end_date,
    coverImageUrl: tournament.cover_image_url,
    entryFee: tournament.entry_fee,
    entryFeeCurrency: tournament.entry_fee_currency,
    clubName: club?.name ?? "Club",
    clubLogoUrl: (club?.branding as ClubBranding | null)?.logo_url ?? null,
    clubCity: club?.city ?? null,
    categories: categories.get(tournamentId) ?? [],
  };
}
