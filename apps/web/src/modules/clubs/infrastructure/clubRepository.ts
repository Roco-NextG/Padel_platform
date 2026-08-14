import { createClient } from "@/lib/supabase/server";
import type { ClubBranding, Database } from "@/lib/supabase/database.types";

type ClubRow = Database["public"]["Tables"]["clubs"]["Row"];

/** The first club where this user holds CLUB_OWNER or CLUB_MANAGER — MVP assumes one club per manager. */
export async function fetchManagedClub(userId: string): Promise<ClubRow | null> {
  const supabase = await createClient();
  const { data: roles } = await supabase
    .from("user_roles")
    .select("club_id, role")
    .eq("user_id", userId)
    .in("role", ["CLUB_OWNER", "CLUB_MANAGER"])
    .not("club_id", "is", null)
    .limit(1);

  const clubId = roles?.[0]?.club_id;
  if (!clubId) return null;

  const { data, error } = await supabase.from("clubs").select("*").eq("id", clubId).maybeSingle();
  if (error) return null;
  return data;
}

export async function createClub(input: {
  name: string;
  city?: string;
  address?: string;
}): Promise<ClubRow> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_club", {
    p_name: input.name,
    p_city: input.city ?? null,
    p_address: input.address ?? null,
    p_branding: {},
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function updateClubBranding(
  clubId: string,
  branding: ClubBranding
): Promise<ClubRow> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_club_branding", {
    p_club_id: clubId,
    p_branding: branding,
  });
  if (error) throw new Error(error.message);
  return data;
}
