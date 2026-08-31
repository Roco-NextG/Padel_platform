import { createClient } from "@/lib/supabase/server";
import type { GenderType } from "@/lib/supabase/database.types";
import type { PlayerRankingItem, Trend, VisiblePlayer } from "../domain/player";

function mapPlayerRow(p: { id: string; first_name: string; last_name: string; phone: string | null; email: string | null; category: number | null; gender: GenderType | null }): VisiblePlayer {
  return {
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    phone: p.phone,
    email: p.email,
    rating: null,
    ratingDeviation: null,
    category: p.category,
    gender: p.gender,
  };
}

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

export interface PlayerInput {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  category: number;
  gender: GenderType | null;
}

export async function fetchPlayerById(playerId: string): Promise<VisiblePlayer | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_player", { p_player_id: playerId });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;
  return {
    id: row.player_id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    rating: row.current_rating,
    ratingDeviation: row.current_rating_deviation,
    category: row.category,
    gender: row.gender,
  };
}

export async function createPlayer(input: PlayerInput): Promise<VisiblePlayer> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_player", {
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_email: input.email,
    p_phone: input.phone,
    p_category: input.category,
    p_gender: input.gender,
  });
  if (error) throw new Error(error.message);
  return mapPlayerRow(data);
}

export async function updatePlayer(playerId: string, input: PlayerInput): Promise<VisiblePlayer> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_player", {
    p_player_id: playerId,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_email: input.email,
    p_phone: input.phone,
    p_category: input.category,
    p_gender: input.gender,
  });
  if (error) throw new Error(error.message);
  return mapPlayerRow(data);
}
