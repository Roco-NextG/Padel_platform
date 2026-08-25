import { createClient } from "@/lib/supabase/server";

export interface ClubSurfaceAccount {
  name: string;
  /** Nombre de la persona logueada (contact_first_name/last_name) — distinto de `name` (el club/organizador) para el sidebar: workspace = la entidad, profile-card = quién está logueado (padel-platform.html). */
  contactName: string;
  city: string | null;
  role: "Club" | "Organizador";
  clubId: string | null;
  organizerId: string | null;
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
      .select("name, city, contact_first_name, contact_last_name")
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
    };
  }

  if (role.role === "ORGANIZADOR" && role.organizer_id) {
    const { data: organizer } = await supabase
      .from("organizers")
      .select("name, city, contact_first_name, contact_last_name")
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
    };
  }

  return null;
}
