import { createClient } from "@/lib/supabase/server";
import type { PlayerRankingItem, Trend, VisiblePlayer } from "../domain/player";

async function fetchVisiblePlayers(): Promise<VisiblePlayer[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fetch_visible_players");
  if (error) throw new Error(error.message);

  return (data ?? []).map((p) => ({
    id: p.player_id,
    firstName: p.first_name,
    lastName: p.last_name,
    phone: p.phone,
    email: p.email,
    rating: p.current_rating,
    ratingDeviation: p.current_rating_deviation,
    category: p.category,
    gender: p.gender,
  }));
}

export async function fetchPlayerDirectory(): Promise<VisiblePlayer[]> {
  const players = await fetchVisiblePlayers();
  return players.sort((a, b) => a.firstName.localeCompare(b.firstName));
}

function trendFrom(history: number[]): { trend: Trend; delta: number } {
  if (history.length < 2) return { trend: "flat", delta: 0 };
  const delta = Math.round((history[history.length - 1] - history[history.length - 2]) * 100) / 100;
  if (delta > 0.05) return { trend: "up", delta };
  if (delta < -0.05) return { trend: "down", delta };
  return { trend: "flat", delta };
}

export async function fetchRanking(): Promise<PlayerRankingItem[]> {
  const supabase = await createClient();
  const players = await fetchVisiblePlayers();
  const playerIds = players.map((p) => p.id);

  const { data: history } = playerIds.length
    ? await supabase.from("rating_history").select("player_id, new_rating, created_at").in("player_id", playerIds).order("created_at")
    : { data: [] };

  const historyByPlayer = new Map<string, number[]>();
  for (const h of history ?? []) {
    const list = historyByPlayer.get(h.player_id) ?? [];
    list.push(h.new_rating);
    historyByPlayer.set(h.player_id, list.slice(-5));
  }

  const ranked = players
    .filter((p) => p.rating !== null)
    .map((p) => {
      const ratingHistory = historyByPlayer.get(p.id) ?? [];
      const { trend, delta } = trendFrom(ratingHistory);
      return { ...p, ratingHistory, trend, trendDelta: delta };
    })
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  return ranked;
}
