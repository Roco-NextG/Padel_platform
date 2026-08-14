import type { AppRole } from "@/lib/supabase/database.types";

export type { AppRole };

export interface RoleAssignment {
  role: AppRole;
  clubId: string | null;
  organizerId: string | null;
}

/**
 * Mirrors the RLS helper functions in supabase/migrations/0002_rls.sql
 * (is_admin, is_club_manager, clubs_insert check) so the UI hides/disables
 * exactly what the database would reject anyway — defense in depth, not the
 * source of truth (that's always RLS).
 */
const CLUB_SURFACE_ROLES: ReadonlySet<AppRole> = new Set([
  "SUPER_ADMIN",
  "ADMIN",
  "CLUB_OWNER",
  "CLUB_MANAGER",
  "ORGANIZER",
  "TOURNAMENT_STAFF",
]);

export function belongsOnClubSurface(roles: RoleAssignment[]): boolean {
  return roles.some((r) => CLUB_SURFACE_ROLES.has(r.role));
}

export function isAdmin(roles: RoleAssignment[]): boolean {
  return roles.some((r) => r.role === "SUPER_ADMIN" || r.role === "ADMIN");
}

/** Mirrors clubs_insert: needs CLUB_OWNER already granted by an admin, or to be admin. */
export function canCreateClub(roles: RoleAssignment[]): boolean {
  return isAdmin(roles) || roles.some((r) => r.role === "CLUB_OWNER");
}

/** Mirrors is_club_manager(target_club_id). */
export function canManageClub(roles: RoleAssignment[], clubId: string): boolean {
  return (
    isAdmin(roles) ||
    roles.some(
      (r) => (r.role === "CLUB_OWNER" || r.role === "CLUB_MANAGER") && r.clubId === clubId
    )
  );
}

export function roleLabel(role: AppRole): string {
  const labels: Record<AppRole, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Admin",
    CLUB_OWNER: "Dueño de Club",
    CLUB_MANAGER: "Gerente de Club",
    ORGANIZER: "Organizador",
    TOURNAMENT_STAFF: "Staff de Torneo",
    PLAYER: "Jugador",
  };
  return labels[role];
}
