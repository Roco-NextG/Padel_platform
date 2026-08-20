import { createClient } from "@/lib/supabase/server";
import type { CourtStatus } from "@/lib/supabase/database.types";
import type { Court } from "../domain/court";

/** courts_write (0002_rls.sql) ya cubre insert/update/delete vía is_club_manager(club_id) — no hace falta ninguna RPC nueva para este módulo. */
export async function fetchClubCourtsFull(clubId: string): Promise<Court[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courts")
    .select("id, name, number, status")
    .eq("club_id", clubId)
    .order("number", { ascending: true, nullsFirst: false })
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * `number` es autoincremental por club (max existente + 1), nunca editable
 * por el organizador — `name` es el texto libre que sí edita, precargado
 * como "Pista {number}" para no forzar a escribir un nombre antes de poder
 * guardar (mismo criterio que COURTS.push(`Pista ${COURTS.length+1}`) en el
 * mock de referencia).
 */
export async function insertCourt(clubId: string, existingCourts: Court[]): Promise<Court> {
  const nextNumber = existingCourts.reduce((max, c) => Math.max(max, c.number ?? 0), 0) + 1;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courts")
    .insert({ club_id: clubId, name: `Pista ${nextNumber}`, number: nextNumber, status: "AVAILABLE" })
    .select("id, name, number, status")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCourtName(courtId: string, name: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("courts").update({ name }).eq("id", courtId);
  if (error) throw new Error(error.message);
}

/** "Quitar" no borra la fila (court_id puede estar referenciado por partidos ya jugados) — alterna AVAILABLE/DISABLED. */
export async function updateCourtStatus(courtId: string, status: CourtStatus): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("courts").update({ status }).eq("id", courtId);
  if (error) throw new Error(error.message);
}
