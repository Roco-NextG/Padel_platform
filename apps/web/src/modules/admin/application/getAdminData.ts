import type { AdminUserSearchResult, Database } from "@/lib/supabase/database.types";
import {
  fetchAuditLog,
  fetchClubsForSelect,
  fetchOrganizersForSelect,
  fetchRolesForUserId,
  searchUsers,
} from "../infrastructure/adminRepository";

export async function getUserSearchResults(query: string): Promise<AdminUserSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return searchUsers(trimmed);
}

export interface SelectedUserDetail {
  roles: Database["public"]["Tables"]["user_roles"]["Row"][];
  clubs: { id: string; name: string }[];
  organizers: { id: string; name: string }[];
}

export async function getSelectedUserDetail(userId: string): Promise<SelectedUserDetail> {
  const [roles, clubs, organizers] = await Promise.all([
    fetchRolesForUserId(userId),
    fetchClubsForSelect(),
    fetchOrganizersForSelect(),
  ]);
  return { roles, clubs, organizers };
}

export async function getAuditLog(entityType: string | null) {
  return fetchAuditLog(entityType);
}
