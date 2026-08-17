import { createClient } from "@/lib/supabase/server";
import type { AdminUserSearchResult, AppRole, Database } from "@/lib/supabase/database.types";

type UserRoleRow = Database["public"]["Tables"]["user_roles"]["Row"];
type AuditLogRow = Database["public"]["Tables"]["audit_log"]["Row"];

/** admin_search_users ya rechaza a quien no sea is_admin() — este repositorio no reimplementa esa autorización. */
export async function searchUsers(query: string): Promise<AdminUserSearchResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_search_users", { p_query: query });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Directo vía RLS (`user_roles_select`, is_admin()) — no hace falta RPC para leer. */
export async function fetchRolesForUserId(userId: string): Promise<UserRoleRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function grantRole(input: {
  userId: string;
  role: AppRole;
  clubId: string | null;
  organizerId: string | null;
}): Promise<UserRoleRow> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_grant_role", {
    p_user_id: input.userId,
    p_role: input.role,
    p_club_id: input.clubId,
    p_organizer_id: input.organizerId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function revokeRole(roleId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_revoke_role", { p_role_id: roleId });
  if (error) throw new Error(error.message);
}

/** Directo vía RLS (`audit_log_select`, is_admin()). */
export async function fetchAuditLog(entityType: string | null): Promise<AuditLogRow[]> {
  const supabase = await createClient();
  let query = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(100);
  if (entityType) query = query.eq("entity_type", entityType);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Público (`clubs_select using (true)`) — usado para el selector de club al otorgar CLUB_OWNER/CLUB_MANAGER. */
export async function fetchClubsForSelect(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clubs").select("id, name").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Público (`organizers_select using (true)`) — usado para el selector de organizador al otorgar ORGANIZER. */
export async function fetchOrganizersForSelect(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("organizers").select("id, name").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}
