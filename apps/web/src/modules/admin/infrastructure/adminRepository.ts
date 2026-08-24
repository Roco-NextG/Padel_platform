import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

/**
 * Revocar una invitación PENDING limpia por completo, a diferencia del
 * "nunca borrar" de una cuenta ya aceptada (0003_rls.sql) — acá no hay
 * ningún historial real que proteger: nadie pudo haber creado canchas,
 * torneos ni nada más sin antes aceptar la invitación (redeem_invite es el
 * único camino a un role_assignment propio). Sin este cleanup, el
 * auth.users sin confirmar quedaba trabado para siempre — inviteUserByEmail
 * rechaza un email ya registrado, así que ni revocando se podía volver a
 * invitar a la misma persona.
 */
export async function revokeInvite(inviteId: string): Promise<void> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: invite, error: fetchError } = await supabase
    .from("pending_invites")
    .select("id, status, club_id, organizer_id, auth_user_id")
    .eq("id", inviteId)
    .single();
  if (fetchError) throw new Error(fetchError.message);
  if (invite.status !== "PENDING") throw new Error("Esta invitación ya no está pendiente.");

  const { error: statusError } = await supabase.from("pending_invites").update({ status: "REVOKED" }).eq("id", inviteId);
  if (statusError) throw new Error(statusError.message);

  if (invite.auth_user_id) {
    await admin.auth.admin.deleteUser(invite.auth_user_id);
  }
  // clubs/organizers no tienen policy de delete (0003_rls.sql, a propósito
  // para cuentas activas) — acá se usa el cliente admin (service_role,
  // bypassea RLS) porque este caso puntual sí es seguro de borrar.
  if (invite.club_id) {
    await admin.from("clubs").delete().eq("id", invite.club_id);
  }
  if (invite.organizer_id) {
    await admin.from("organizers").delete().eq("id", invite.organizer_id);
  }
}
