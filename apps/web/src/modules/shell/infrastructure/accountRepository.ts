import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIME_ZONE } from "@/lib/timezone";

export interface ClubSurfaceAccount {
  name: string;
  /** Nombre de la persona logueada (contact_first_name/last_name) — distinto de `name` (el club/organizador) para el sidebar: workspace = la entidad, profile-card = quién está logueado (padel-platform.html). */
  contactName: string;
  city: string | null;
  role: "Club" | "Organizador";
  clubId: string | null;
  organizerId: string | null;
  /** Zona horaria propia de esta cuenta (clubs.time_zone / organizers.time_zone) — para el reloj del header y como fallback cuando una pantalla no tiene un club de sede específico a mano. Los partidos en sí siempre usan la zona del CLUB donde se juegan, no esta. */
  timeZone: string;
}

/**
 * La cuenta Club/Organizador de este usuario para el sidebar — si tiene
 * varias filas de role_assignments (ej. un admin que también es club),
 * toma la primera CLUB/ORGANIZADOR encontrada, mismo criterio que
 * create_player_for_enrollment (0015) al decidir a qué roster dar de alta
 * un jugador nuevo.
 */
export async function fetchClubSurfaceAccount(userId: string): Promise<ClubSurfaceAccount | null> {
  const supabase = await createClient();
  const { data: role } = await supabase
    .from("role_assignments")
    .select("role, club_id, organizer_id")
    .eq("user_id", userId)
    .in("role", ["CLUB", "ORGANIZADOR"])
    .limit(1)
    .maybeSingle();

  if (!role) return null;

  if (role.role === "CLUB" && role.club_id) {
    const { data: club } = await supabase
      .from("clubs")
      .select("name, city, contact_first_name, contact_last_name, time_zone")
      .eq("id", role.club_id)
      .maybeSingle();
    const contactName = [club?.contact_first_name, club?.contact_last_name].filter(Boolean).join(" ");
    return {
      name: club?.name ?? "Club",
      contactName: contactName || (club?.name ?? "Club"),
      city: club?.city ?? null,
      role: "Club",
      clubId: role.club_id,
      organizerId: null,
      timeZone: club?.time_zone ?? DEFAULT_TIME_ZONE,
    };
  }

  if (role.role === "ORGANIZADOR" && role.organizer_id) {
    const { data: organizer } = await supabase
      .from("organizers")
      .select("name, city, contact_first_name, contact_last_name, time_zone")
      .eq("id", role.organizer_id)
      .maybeSingle();
    const contactName = [organizer?.contact_first_name, organizer?.contact_last_name].filter(Boolean).join(" ");
    return {
      name: organizer?.name ?? "Organizador",
      contactName: contactName || (organizer?.name ?? "Organizador"),
      city: organizer?.city ?? null,
      role: "Organizador",
      clubId: null,
      organizerId: role.organizer_id,
      timeZone: organizer?.time_zone ?? DEFAULT_TIME_ZONE,
    };
  }

  return null;
}

/** Guarda la zona horaria de la cuenta (club u organizador, según corresponda) — usada por Configuración. */
export async function updateAccountTimeZone(account: ClubSurfaceAccount, timeZone: string): Promise<void> {
  const supabase = await createClient();
  if (account.role === "Club" && account.clubId) {
    const { error } = await supabase.from("clubs").update({ time_zone: timeZone }).eq("id", account.clubId);
    if (error) throw new Error(error.message);
    return;
  }
  if (account.role === "Organizador" && account.organizerId) {
    const { error } = await supabase.from("organizers").update({ time_zone: timeZone }).eq("id", account.organizerId);
    if (error) throw new Error(error.message);
    return;
  }
  throw new Error("Esta cuenta no tiene club u organizador asociado.");
}
