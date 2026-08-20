import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole } from "@/lib/supabase/database.types";

export interface AccountRow {
  userId: string;
  email: string | null;
  role: AppRole;
  scopeId: string | null;
  scopeName: string | null;
  isActive: boolean;
}

/** Cruza role_assignments (RLS ya lo limita a admin) con clubs/organizers y con auth.users (vía admin client, único lugar donde vive el email). */
export async function fetchAccounts(): Promise<AccountRow[]> {
  const supabase = await createClient();
  const [{ data: roles, error: rolesError }, { data: clubs }, { data: organizers }] = await Promise.all([
    supabase.from("role_assignments").select("user_id, role, club_id, organizer_id"),
    supabase.from("clubs").select("id, name, is_active"),
    supabase.from("organizers").select("id, name, is_active"),
  ]);
  if (rolesError) throw new Error(rolesError.message);

  const clubById = new Map((clubs ?? []).map((c) => [c.id, c]));
  const organizerById = new Map((organizers ?? []).map((o) => [o.id, o]));
  const admin = createAdminClient();

  return Promise.all(
    (roles ?? []).map(async (r): Promise<AccountRow> => {
      const { data } = await admin.auth.admin.getUserById(r.user_id);
      const scope = r.club_id ? clubById.get(r.club_id) : r.organizer_id ? organizerById.get(r.organizer_id) : null;
      return {
        userId: r.user_id,
        email: data.user?.email ?? null,
        role: r.role,
        scopeId: r.club_id ?? r.organizer_id ?? null,
        scopeName: scope?.name ?? null,
        isActive: scope ? scope.is_active : !data.user?.banned_until,
      };
    })
  );
}

/**
 * Activar/desactivar toca dos cosas: el is_active de la fila club/organizer
 * (estado de negocio, lo que ve el admin en la lista) y el ban del propio
 * auth.users (la aplicación real — sin esto, desactivar sería solo
 * cosmético y la cuenta podría seguir iniciando sesión).
 */
export async function setAccountActive(input: {
  userId: string;
  role: AppRole;
  scopeId: string | null;
  active: boolean;
}): Promise<void> {
  const admin = createAdminClient();

  if (input.scopeId && (input.role === "CLUB" || input.role === "ORGANIZADOR")) {
    const table = input.role === "CLUB" ? "clubs" : "organizers";
    const { error } = await admin.from(table).update({ is_active: input.active }).eq("id", input.scopeId);
    if (error) throw new Error(error.message);
  }

  const { error: banError } = await admin.auth.admin.updateUserById(input.userId, {
    ban_duration: input.active ? "none" : "876000h",
  });
  if (banError) throw new Error(banError.message);
}

/**
 * Crea la fila clubs/organizers y dispara la invitación real por email vía
 * Supabase Auth (auth.admin.inviteUserByEmail) — el token que crea la
 * cuenta lo genera y valida Supabase, no este código (ver 0004_invite_rpc.sql).
 * pending_invites es solo metadata de negocio: qué rol/alcance asignar
 * cuando se acepte. No es atómico con el insert de clubs/organizers (dos
 * sistemas distintos no pueden compartir transacción) — si falla acá, el
 * club/organizer queda huérfano visible en /admin/invitaciones, no oculto.
 */
export async function createAccountAndInvite(input: {
  role: "CLUB" | "ORGANIZADOR";
  name: string;
  email: string;
  invitedBy: string;
  redirectTo: string;
}): Promise<void> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const table = input.role === "CLUB" ? "clubs" : "organizers";
  const { data: entity, error: entityError } = await supabase
    .from(table)
    .insert({ name: input.name })
    .select("id")
    .single();
  if (entityError) throw new Error(entityError.message);

  const clubId = input.role === "CLUB" ? entity.id : null;
  const organizerId = input.role === "ORGANIZADOR" ? entity.id : null;

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: { invited_role: input.role, invited_club_id: clubId, invited_organizer_id: organizerId },
    redirectTo: input.redirectTo,
  });
  if (inviteError) throw new Error(inviteError.message);

  const { error: pendingError } = await supabase.from("pending_invites").insert({
    email: input.email,
    role: input.role,
    club_id: clubId,
    organizer_id: organizerId,
    invited_by: input.invitedBy,
    auth_user_id: inviteData.user?.id ?? null,
  });
  if (pendingError) throw new Error(pendingError.message);
}

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
