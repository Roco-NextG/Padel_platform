import type { AppRole } from "@/lib/supabase/database.types";

export type { AppRole };

export interface RoleAssignment {
  role: AppRole;
  clubId: string | null;
  organizerId: string | null;
}

/**
 * Mirrors the RLS helper functions in supabase/migrations/0003_rls.sql
 * (is_admin, is_club, is_organizer) so the UI hides/disables exactly what
 * the database would reject anyway — defense in depth, not the source of
 * truth (that's always RLS).
 */
export function isAdmin(roles: RoleAssignment[]): boolean {
  return roles.some((r) => r.role === "ADMIN");
}

export function isClub(roles: RoleAssignment[], clubId?: string): boolean {
  return (
    isAdmin(roles) ||
    roles.some((r) => r.role === "CLUB" && (clubId === undefined || r.clubId === clubId))
  );
}

export function isOrganizer(roles: RoleAssignment[], organizerId?: string): boolean {
  return (
    isAdmin(roles) ||
    roles.some(
      (r) => r.role === "ORGANIZADOR" && (organizerId === undefined || r.organizerId === organizerId)
    )
  );
}

const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: "Admin",
  CLUB: "Club",
  ORGANIZADOR: "Organizador",
  JUGADOR: "Jugador",
};

export function roleLabel(role: AppRole): string {
  return ROLE_LABELS[role];
}

export const ALL_APP_ROLES: AppRole[] = Object.keys(ROLE_LABELS) as AppRole[];

/** Mirrors pending_invites' scope check (0002_schema.sql / 0004_invite_rpc.sql). */
export function roleRequiresClub(role: AppRole): boolean {
  return role === "CLUB";
}

export function roleRequiresOrganizer(role: AppRole): boolean {
  return role === "ORGANIZADOR";
}

/** Gate for the (club) route group — Club/Organizador panel, plus admin (can always inspect any surface). */
export function belongsOnClubSurface(roles: RoleAssignment[]): boolean {
  return isAdmin(roles) || roles.some((r) => r.role === "CLUB" || r.role === "ORGANIZADOR");
}

/** Where a logged-in user lands after signing in — expand as new role surfaces ship. */
export function homePathForRoles(roles: RoleAssignment[]): string {
  if (isAdmin(roles)) return "/admin";
  if (belongsOnClubSurface(roles)) return "/dashboard";
  return "/bienvenida";
}
