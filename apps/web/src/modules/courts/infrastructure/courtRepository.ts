import { createClient } from "@/lib/supabase/server";
import type { CourtStatus } from "@/lib/supabase/database.types";
import type { Court } from "../domain/court";

function toCourt(row: { id: string; club_id: string; name: string; number: number | null; indoor: boolean; status: CourtStatus }): Court {
  return { id: row.id, clubId: row.club_id, name: row.name, number: row.number, indoor: row.indoor, status: row.status };
}

export async function fetchClubCourts(clubId: string): Promise<Court[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courts")
    .select("id, club_id, name, number, indoor, status")
    .eq("club_id", clubId)
    .order("number", { ascending: true, nullsFirst: false })
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map(toCourt);
}

/** `number` es autoincremental por club (max existente + 1) — mismo criterio que apps/web/src/modules/courts previo al reset. */
export async function insertCourt(clubId: string, existingCourts: Court[]): Promise<Court> {
  const nextNumber = existingCourts.reduce((max, c) => Math.max(max, c.number ?? 0), 0) + 1;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courts")
    .insert({ club_id: clubId, name: `Pista ${nextNumber}`, number: nextNumber, status: "AVAILABLE" })
    .select("id, club_id, name, number, indoor, status")
    .single();
  if (error) throw new Error(error.message);
  return toCourt(data);
}

export async function updateCourtName(courtId: string, name: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("courts").update({ name }).eq("id", courtId);
  if (error) throw new Error(error.message);
}

/** "Quitar" no borra la fila (court_id puede estar referenciado por partidos ya jugados) — alterna AVAILABLE/DISABLED. */
export async function setCourtStatus(courtId: string, status: CourtStatus): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("courts").update({ status }).eq("id", courtId);
  if (error) throw new Error(error.message);
}
