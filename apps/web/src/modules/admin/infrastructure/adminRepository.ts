import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/database.types";

export interface PendingInviteRow {
  id: string;
  email: string;
  role: AppRole;
  scopeName: string | null;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export async function fetchPendingInvites(): Promise<PendingInviteRow[]> {
  const supabase = await createClient();
  const [{ data: invites, error }, { data: clubs }, { data: organizers }] = await Promise.all([
    supabase
      .from("pending_invites")
      .select("id, email, role, club_id, organizer_id, status, expires_at, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("clubs").select("id, name"),
    supabase.from("organizers").select("id, name"),
  ]);
  if (error) throw new Error(error.message);

  const clubById = new Map((clubs ?? []).map((c) => [c.id, c.name]));
  const organizerById = new Map((organizers ?? []).map((o) => [o.id, o.name]));

  return (invites ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    scopeName: i.club_id ? (clubById.get(i.club_id) ?? null) : i.organizer_id ? (organizerById.get(i.organizer_id) ?? null) : null,
    status: i.status,
    expiresAt: i.expires_at,
    createdAt: i.created_at,
  }));
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("pending_invites").update({ status: "REVOKED" }).eq("id", inviteId);
  if (error) throw new Error(error.message);
}
