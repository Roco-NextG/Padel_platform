import { createClient } from "@/lib/supabase/server";
import type { CreateTournamentInput, Tournament } from "../domain/tournament";
import type { TournamentCategory } from "../domain/category";
import { categoryName } from "../domain/category";
import type { ClubSurfaceAccount } from "@/modules/shell/infrastructure/accountRepository";

/**
 * "Mis torneos" para una cuenta Club: club_id = la propia, organizer_id
 * null (el club lo organiza él mismo, no un Organizador ajeno alojado ahí
 * — ver la decisión de ownership del plan). Para una cuenta Organizador:
 * organizer_id = la propia, sin importar en qué club esté alojado cada uno.
 */
export async function fetchMyTournaments(account: ClubSurfaceAccount): Promise<Tournament[]> {
  const supabase = await createClient();
  let query = supabase
    .from("tournaments")
    .select("id, name, description, club_id, organizer_id, status, is_published, start_date, end_date, created_at, clubs(name)")
    .order("created_at", { ascending: false });

  query = account.role === "Club" ? query.eq("club_id", account.clubId!).is("organizer_id", null) : query.eq("organizer_id", account.organizerId!);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const tournamentIds = (data ?? []).map((t) => t.id);
  const { data: categories } = tournamentIds.length
    ? await supabase.from("tournament_categories").select("id, tournament_id").in("tournament_id", tournamentIds)
    : { data: [] };
  const categoryCountByTournament = new Map<string, number>();
  for (const c of categories ?? []) {
    categoryCountByTournament.set(c.tournament_id, (categoryCountByTournament.get(c.tournament_id) ?? 0) + 1);
  }

  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    clubId: t.club_id,
    clubName: (t.clubs as unknown as { name: string } | null)?.name ?? "?",
    organizerId: t.organizer_id,
    status: t.status,
    isPublished: t.is_published,
    startDate: t.start_date,
    endDate: t.end_date,
    categoryCount: categoryCountByTournament.get(t.id) ?? 0,
    createdAt: t.created_at,
  }));
}

export async function fetchTournamentById(tournamentId: string): Promise<Tournament | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournaments")
    .select("id, name, description, club_id, organizer_id, status, is_published, start_date, end_date, created_at, clubs(name)")
    .eq("id", tournamentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    clubId: data.club_id,
    clubName: (data.clubs as unknown as { name: string } | null)?.name ?? "?",
    organizerId: data.organizer_id,
    status: data.status,
    isPublished: data.is_published,
    startDate: data.start_date,
    endDate: data.end_date,
    categoryCount: 0,
    createdAt: data.created_at,
  };
}

/**
 * account.role decide organizer_id: null si lo crea el propio Club, la
 * propia si lo crea un Organizador (que además debe indicar hostClubId,
 * validado en la capa de aplicación antes de llegar acá).
 *
 * El id se genera acá en vez de pedirlo de vuelta con .select() a
 * propósito: tournaments_select (0010_tournament_rls.sql) llama
 * is_tournament_manager(id), que vuelve a consultar la propia tabla
 * tournaments — cuando PostgREST hace INSERT ... RETURNING (lo que dispara
 * .select() encadenado), esa lectura de la fila recién insertada dentro del
 * mismo statement evalúa a "no visible todavía" y el insert entero falla
 * con "new row violates row-level security policy", aunque la fila sea
 * 100% válida (confirmado en vivo: el mismo insert sin .select() funciona
 * siempre, y is_tournament_manager(id) da true un instante después, ya
 * confirmado). Ninguna otra tabla de este proyecto tiene este problema
 * porque tournaments es la única cuyo select policy necesita re-consultarse
 * a sí misma — el resto de los self-checks pasan por tablas ya existentes
 * (tournament_categories, teams, etc.), nunca por la tabla que se está
 * insertando.
 */
export async function createTournament(account: ClubSurfaceAccount, input: CreateTournamentInput): Promise<string> {
  const supabase = await createClient();
  const clubId = account.role === "Club" ? account.clubId! : input.hostClubId!;
  const id = crypto.randomUUID();

  const { error } = await supabase.from("tournaments").insert({
    id,
    name: input.name,
    description: input.description || null,
    club_id: clubId,
    organizer_id: account.role === "Organizador" ? account.organizerId : null,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
    status: "DRAFT",
  });
  if (error) throw new Error(error.message);
  return id;
}

export async function fetchCategories(tournamentId: string): Promise<TournamentCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tournament_categories")
    .select("id, tournament_id, name, level, gender_restriction, uses_group_stage")
    .eq("tournament_id", tournamentId)
    .order("level");
  if (error) throw new Error(error.message);

  return (data ?? []).map((c) => ({
    id: c.id,
    tournamentId: c.tournament_id,
    name: c.name,
    level: c.level ?? "",
    genderRestriction: c.gender_restriction ?? "MIXED",
    usesGroupStage: c.uses_group_stage,
  }));
}

export async function addCategory(
  tournamentId: string,
  level: number,
  gender: "MALE" | "FEMALE" | "MIXED",
  usesGroupStage: boolean
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("tournament_categories").insert({
    tournament_id: tournamentId,
    name: categoryName(level, gender),
    level: String(level),
    gender_restriction: gender,
    uses_group_stage: usesGroupStage,
  });
  if (error) throw new Error(error.message);
}

export async function removeCategory(categoryId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("tournament_categories").delete().eq("id", categoryId);
  if (error) throw new Error(error.message);
}

/** REGISTRATION_OPEN al publicar (no PUBLISHED a secas) — al publicar, las inscripciones ya construidas en el wizard quedan abiertas de una, no hace falta un paso más para eso. */
export async function setTournamentPublished(tournamentId: string, published: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tournaments")
    .update({ is_published: published, status: published ? "REGISTRATION_OPEN" : "DRAFT" })
    .eq("id", tournamentId);
  if (error) throw new Error(error.message);
}
