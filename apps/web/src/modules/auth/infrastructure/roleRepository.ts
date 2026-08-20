import { createClient } from "@/lib/supabase/server";
import type { RoleAssignment } from "../domain/roles";

export async function fetchRolesForUser(userId: string): Promise<RoleAssignment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("role_assignments")
    .select("role, club_id, organizer_id")
    .eq("user_id", userId);

  if (error || !data) return [];
  return data.map((r) => ({ role: r.role, clubId: r.club_id, organizerId: r.organizer_id }));
}
