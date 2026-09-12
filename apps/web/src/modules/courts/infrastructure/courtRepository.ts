import { createClient } from "@/lib/supabase/server";
import type { CourtStatus } from "@/lib/supabase/database.types";
import type { Court } from "../domain/court";

function toCourt(row: { id: string; club_id: string; name: string; number: number | null; indoor: boolean; status: CourtStatus }): Court {
  return { id: row.id, clubId: row.club_id, name: row.name, number: row.number, indoor: row.indoor, status: row.status };
}

export interface ClubHostOption {
  clubId: string;
  clubName: string;
  courtCount: number;
  courtNames: string[];
}

/**
 * Para el picker de sede del wizard de Crear Torneo (Organizador eligiendo
 * dónde alojar su torneo). courts_select ya es visible para cualquier
 * Club/Organizador vía is_tournament_staff() (0007_courts_and_audit_log.sql).
 * clubs_select NO lo era — solo dejaba ver el club propio de una cuenta
 * CLUB (is_club(id)), así que esta lectura devolvía 0 clubes para cualquier
 * Organizador real (bug corregido en 0031_organizer_creates_club.sql,
 * ampliado a is_tournament_staff() + is_active).
 */
export async function fetchClubHostOptions(): Promise<ClubHostOption[]> {
  const supabase = await createClient();
  const [{ data: clubs, error: clubsError }, { data: courts, error: courtsError }] = await Promise.all([
    supabase.from("clubs").select("id, name").eq("is_active", true).order("name"),
    supabase.from("courts").select("club_id, name").eq("status", "AVAILABLE"),
  ]);
  if (clubsError) throw new Error(clubsError.message);
  if (courtsError) throw new Error(courtsError.message);

  const courtsByClub = new Map<string, string[]>();
  for (const c of courts ?? []) {
    const list = courtsByClub.get(c.club_id) ?? [];
    list.push(c.name);
    courtsByClub.set(c.club_id, list);
  }

  return (clubs ?? []).map((c) => {
    const names = courtsByClub.get(c.id) ?? [];
    return { clubId: c.id, clubName: c.name, courtCount: names.length, courtNames: names };
  });
}

/**
 * Un Organizador nunca es dueño de un club vía is_club() (esa función solo
 * resuelve para la cuenta CLUB de siempre), así que la CREACIÓN no es un
 * insert directo: pasa por una RPC security definer que valida el rol
 * adentro y crea el club + sus pistas de una sola vez, para destrabar el
 * wizard de Crear Torneo cuando el Organizador todavía no tiene ningún club
 * para elegir. La EDICIÓN posterior (nombre/ciudad/pistas) de un club así
 * creado sí es un update/insert directo — is_organizer_created_club()
 * (0032_organizer_edits_own_club.sql) lo permite en RLS igual que is_club().
 */
export async function createClubAsOrganizer(name: string, city: string | null, courtCount: number): Promise<ClubHostOption> {
  const supabase = await createClient();
  const { data: clubId, error } = await supabase.rpc("create_club_as_organizer", {
    p_name: name,
    p_city: city,
    p_court_count: courtCount,
  });
  if (error) throw new Error(error.message);
  const courtNames = Array.from({ length: courtCount }, (_, i) => `Pista ${i + 1}`);
  return { clubId, clubName: name.trim(), courtCount, courtNames };
}

export interface OrganizerCreatedClub {
  clubId: string;
  clubName: string;
  city: string | null;
}

/** Clubes que este Organizador creó desde el wizard de Crear Torneo (0031) — para poder editarlos si se equivocó al cargarlos. */
export async function fetchClubsCreatedByOrganizer(organizerId: string): Promise<OrganizerCreatedClub[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clubs")
    .select("id, name, city")
    .eq("created_by_organizer_id", organizerId)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({ clubId: c.id, clubName: c.name, city: c.city }));
}

/** Ownership real de un club (created_by_organizer_id) — usado por el guard de las Server Actions de pistas/datos de club para saber si el Organizador que las llama puede administrar ESTE club puntual. */
export async function fetchClubOwnership(clubId: string): Promise<{ createdByOrganizerId: string | null } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clubs").select("created_by_organizer_id").eq("id", clubId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { createdByOrganizerId: data.created_by_organizer_id } : null;
}

export async function updateClubBasicInfo(clubId: string, name: string, city: string | null): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("clubs").update({ name, city }).eq("id", clubId);
  if (error) throw new Error(error.message);
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
