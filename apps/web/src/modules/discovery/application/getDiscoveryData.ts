import {
  fetchAllPublishedTournaments,
  fetchCategoryNamesByTournament,
  fetchNearbyTournaments,
  fetchTournamentDiscoveryDetail,
  fetchUngeolocatedPublishedTournaments,
  type DiscoveryTournamentRow,
  type TournamentDiscoveryDetail,
} from "../infrastructure/discoveryRepository";

export interface DiscoveryTournamentCard {
  tournamentId: string;
  name: string;
  startDate: string | null;
  clubName: string;
  clubLogoUrl: string | null;
  clubCity: string | null;
  categories: string[];
  entryFee: number | null;
  entryFeeCurrency: string | null;
  distanceKm: number | null;
}

function toCard(row: DiscoveryTournamentRow, categories: Map<string, string[]>, distanceKm: number | null): DiscoveryTournamentCard {
  return {
    tournamentId: row.tournamentId,
    name: row.name,
    startDate: row.startDate,
    clubName: row.clubName,
    clubLogoUrl: row.clubLogoUrl,
    clubCity: row.clubCity,
    categories: categories.get(row.tournamentId) ?? [],
    entryFee: row.entryFee,
    entryFeeCurrency: row.entryFeeCurrency,
    distanceKm,
  };
}

export interface NearbyDiscoveryResult {
  nearby: DiscoveryTournamentCard[];
  others: DiscoveryTournamentCard[];
}

/** Con ubicación disponible: cercanos por distancia real (Haversine, 0017) + los que quedaron afuera de esa función por no tener club geolocalizado. */
export async function getNearbyDiscovery(lat: number, lng: number): Promise<NearbyDiscoveryResult> {
  const [nearbyRows, otherRows] = await Promise.all([
    fetchNearbyTournaments(lat, lng),
    fetchUngeolocatedPublishedTournaments(),
  ]);
  const categories = await fetchCategoryNamesByTournament([
    ...nearbyRows.map((r) => r.tournament_id),
    ...otherRows.map((r) => r.tournamentId),
  ]);

  return {
    nearby: nearbyRows.map((r) =>
      toCard(
        {
          tournamentId: r.tournament_id,
          name: r.name,
          startDate: r.start_date,
          coverImageUrl: r.cover_image_url,
          entryFee: r.entry_fee,
          entryFeeCurrency: r.entry_fee_currency,
          clubId: r.club_id,
          clubName: r.club_name,
          clubLogoUrl: r.club_logo_url,
          clubCity: r.club_city,
        },
        categories,
        r.distance_km
      )
    ),
    others: otherRows.map((r) => toCard(r, categories, null)),
  };
}

/** Sin ubicación (denegada o no disponible): todos los torneos publicados ordenados por fecha, sin distancia. */
export async function getFallbackDiscovery(): Promise<DiscoveryTournamentCard[]> {
  const rows = await fetchAllPublishedTournaments();
  const categories = await fetchCategoryNamesByTournament(rows.map((r) => r.tournamentId));
  return rows.map((r) => toCard(r, categories, null));
}

export async function getTournamentDiscoveryDetail(tournamentId: string): Promise<TournamentDiscoveryDetail | null> {
  return fetchTournamentDiscoveryDetail(tournamentId);
}
