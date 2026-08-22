import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateAccountInput } from "../domain/createAccount";

export type PlatformAccountType = "JUGADOR" | "CLUB" | "ORGANIZADOR";

export interface PlatformAccount {
  accountType: PlatformAccountType;
  entityId: string;
  userId: string | null;
  displayName: string;
  email: string | null;
  isActive: boolean;
  isAdmin: boolean;
  planId: string | null;
  planName: string | null;
  lastActiveAt: string | null;
  createdAt: string;
}

/**
 * Une players/clubs/organizers en una sola lista — cada fila es una cuenta
 * de la plataforma, sin importar el tipo. Se recorre por tabla de negocio
 * (no por role_assignments) para que un club/organizador recién invitado
 * pero todavía sin aceptar aparezca igual — solo su email/userId quedan
 * null hasta que acepte.
 */
export async function fetchAllPlatformUsers(): Promise<PlatformAccount[]> {
  const supabase = await createClient();
  const [
    { data: clubs, error: clubsError },
    { data: organizers, error: organizersError },
    { data: players, error: playersError },
    { data: roleAssignments, error: rolesError },
    { data: billing, error: billingError },
    { data: plans, error: plansError },
    { data: activity, error: activityError },
  ] = await Promise.all([
    supabase.from("clubs").select("id, name, is_active, created_at"),
    supabase.from("organizers").select("id, name, is_active, created_at"),
    supabase.from("players").select("id, user_id, first_name, last_name, is_active, created_at"),
    supabase.from("role_assignments").select("user_id, role, club_id, organizer_id"),
    supabase.from("account_billing").select("club_id, organizer_id, plan_id"),
    supabase.from("plans").select("id, name"),
    supabase.from("account_activity").select("user_id, last_active_at"),
  ]);
  const firstError = clubsError ?? organizersError ?? playersError ?? rolesError ?? billingError ?? plansError ?? activityError;
  if (firstError) throw new Error(firstError.message);

  const adminUserIds = new Set(
    (roleAssignments ?? []).filter((r) => r.role === "ADMIN").map((r) => r.user_id)
  );
  const roleByClubId = new Map((roleAssignments ?? []).filter((r) => r.club_id).map((r) => [r.club_id as string, r]));
  const roleByOrganizerId = new Map(
    (roleAssignments ?? []).filter((r) => r.organizer_id).map((r) => [r.organizer_id as string, r])
  );
  const billingByClubId = new Map((billing ?? []).filter((b) => b.club_id).map((b) => [b.club_id as string, b]));
  const billingByOrganizerId = new Map(
    (billing ?? []).filter((b) => b.organizer_id).map((b) => [b.organizer_id as string, b])
  );
  const planNameById = new Map((plans ?? []).map((p) => [p.id, p.name]));
  const lastActiveByUserId = new Map((activity ?? []).map((a) => [a.user_id, a.last_active_at]));

  const knownUserIds = Array.from(
    new Set(
      [
        ...(roleAssignments ?? []).map((r) => r.user_id),
        ...(players ?? []).map((p) => p.user_id).filter((id): id is string => id != null),
      ].filter(Boolean)
    )
  );
  const admin = createAdminClient();
  const emailByUserId = new Map<string, string | null>();
  await Promise.all(
    knownUserIds.map(async (userId) => {
      const { data } = await admin.auth.admin.getUserById(userId);
      emailByUserId.set(userId, data.user?.email ?? null);
    })
  );

  const clubRows: PlatformAccount[] = (clubs ?? []).map((c) => {
    const role = roleByClubId.get(c.id);
    const billingRow = billingByClubId.get(c.id);
    return {
      accountType: "CLUB",
      entityId: c.id,
      userId: role?.user_id ?? null,
      displayName: c.name,
      email: role ? (emailByUserId.get(role.user_id) ?? null) : null,
      isActive: c.is_active,
      isAdmin: role ? adminUserIds.has(role.user_id) : false,
      planId: billingRow?.plan_id ?? null,
      planName: billingRow?.plan_id ? (planNameById.get(billingRow.plan_id) ?? null) : null,
      lastActiveAt: role ? (lastActiveByUserId.get(role.user_id) ?? null) : null,
      createdAt: c.created_at,
    };
  });

  const organizerRows: PlatformAccount[] = (organizers ?? []).map((o) => {
    const role = roleByOrganizerId.get(o.id);
    const billingRow = billingByOrganizerId.get(o.id);
    return {
      accountType: "ORGANIZADOR",
      entityId: o.id,
      userId: role?.user_id ?? null,
      displayName: o.name,
      email: role ? (emailByUserId.get(role.user_id) ?? null) : null,
      isActive: o.is_active,
      isAdmin: role ? adminUserIds.has(role.user_id) : false,
      planId: billingRow?.plan_id ?? null,
      planName: billingRow?.plan_id ? (planNameById.get(billingRow.plan_id) ?? null) : null,
      lastActiveAt: role ? (lastActiveByUserId.get(role.user_id) ?? null) : null,
      createdAt: o.created_at,
    };
  });

  const playerRows: PlatformAccount[] = (players ?? []).map((p) => {
    return {
      accountType: "JUGADOR",
      entityId: p.id,
      userId: p.user_id,
      displayName: `${p.first_name} ${p.last_name}`.trim(),
      email: p.user_id ? (emailByUserId.get(p.user_id) ?? null) : null,
      isActive: p.is_active,
      isAdmin: p.user_id ? adminUserIds.has(p.user_id) : false,
      planId: null,
      planName: null,
      lastActiveAt: p.user_id ? (lastActiveByUserId.get(p.user_id) ?? null) : null,
      createdAt: p.created_at,
    };
  });

  return [...clubRows, ...organizerRows, ...playerRows].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Generaliza createAccountAndInvite (adminRepository.ts) a los 3 tipos de
 * cuenta, con los campos de contacto que antes no se pedían. Mismo patrón:
 * no es atómico con el insert de la entidad — si la invitación falla, la
 * entidad queda huérfana visible en /admin/invitaciones.
 */
export async function createAccountWithInvite(input: CreateAccountInput, invitedBy: string, redirectTo: string): Promise<void> {
  const supabase = await createClient();
  const admin = createAdminClient();

  let clubId: string | null = null;
  let organizerId: string | null = null;

  if (input.tipoUsuario === "CLUB" || input.tipoUsuario === "ORGANIZADOR") {
    const table = input.tipoUsuario === "CLUB" ? "clubs" : "organizers";
    const { data: entity, error: entityError } = await supabase
      .from(table)
      .insert({
        name: input.entityName,
        city: input.entityCity || null,
        contact_email: input.entityContactEmail || null,
        contact_first_name: input.firstName,
        contact_last_name: input.lastName,
        contact_phone: input.phone,
      })
      .select("id")
      .single();
    if (entityError) throw new Error(entityError.message);
    if (input.tipoUsuario === "CLUB") clubId = entity.id;
    else organizerId = entity.id;

    if (input.planId) {
      const { error: billingError } = await supabase
        .from("account_billing")
        .insert({ club_id: clubId, organizer_id: organizerId, plan_id: input.planId, payment_status: "NONE" });
      if (billingError) throw new Error(billingError.message);
    }
  }

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: {
      invited_role: input.tipoUsuario,
      invited_club_id: clubId,
      invited_organizer_id: organizerId,
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
    },
    redirectTo,
  });
  if (inviteError) throw new Error(inviteError.message);

  if (input.tipoUsuario === "JUGADOR") {
    const { error: playerError } = await supabase.from("players").insert({
      user_id: inviteData.user?.id ?? null,
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone,
    });
    if (playerError) throw new Error(playerError.message);
  }

  const { error: pendingError } = await supabase.from("pending_invites").insert({
    email: input.email,
    role: input.tipoUsuario,
    club_id: clubId,
    organizer_id: organizerId,
    invited_by: invitedBy,
    auth_user_id: inviteData.user?.id ?? null,
  });
  if (pendingError) throw new Error(pendingError.message);
}

export async function makeAdmin(userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("role_assignments")
    .upsert({ user_id: userId, role: "ADMIN" }, { onConflict: "user_id,role,club_id,organizer_id" });
  if (error) throw new Error(error.message);
}

/**
 * Borra la entidad de negocio primero (cascada a account_billing y a sus
 * pending_invites), después el propio auth.users (cascada a
 * role_assignments/account_activity — seguro gracias al fix de FK en
 * 0005_billing_schema.sql).
 */
export async function deleteAccount(accountType: PlatformAccountType, entityId: string, userId: string | null): Promise<void> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const table = accountType === "CLUB" ? "clubs" : accountType === "ORGANIZADOR" ? "organizers" : "players";
  const { error: entityError } = await supabase.from(table).delete().eq("id", entityId);
  if (entityError) throw new Error(entityError.message);

  if (userId) {
    const { error: userError } = await admin.auth.admin.deleteUser(userId);
    if (userError) throw new Error(userError.message);
  }
}

/**
 * Activar/desactivar toca dos cosas: el is_active de la entidad (club/
 * organizer/player, lo que ve el admin en la lista) y el ban del propio
 * auth.users (la aplicación real) — sin esto sería solo cosmético.
 */
export async function setAccountActive(
  accountType: PlatformAccountType,
  entityId: string,
  userId: string | null,
  active: boolean
): Promise<void> {
  const supabase = await createClient();
  const table = accountType === "CLUB" ? "clubs" : accountType === "ORGANIZADOR" ? "organizers" : "players";
  const { error } = await supabase.from(table).update({ is_active: active }).eq("id", entityId);
  if (error) throw new Error(error.message);

  if (userId) {
    const admin = createAdminClient();
    const { error: banError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: active ? "none" : "876000h",
    });
    if (banError) throw new Error(banError.message);
  }
}

export async function changeAccountPlan(
  accountType: "CLUB" | "ORGANIZADOR",
  entityId: string,
  planId: string | null
): Promise<void> {
  const supabase = await createClient();
  const column = accountType === "CLUB" ? "club_id" : "organizer_id";

  const { data: existing } = await supabase
    .from("account_billing")
    .select("id, plan_id, payment_status")
    .eq(column, entityId)
    .maybeSingle();

  const fromPlanId = existing?.plan_id ?? null;
  const currentStatus = existing?.payment_status ?? "NONE";

  if (existing) {
    const { error } = await supabase.from("account_billing").update({ plan_id: planId }).eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("account_billing").insert({
      club_id: accountType === "CLUB" ? entityId : null,
      organizer_id: accountType === "ORGANIZADOR" ? entityId : null,
      plan_id: planId,
      payment_status: "NONE",
    });
    if (error) throw new Error(error.message);
  }

  const { error: eventError } = await supabase.from("billing_events").insert({
    club_id: accountType === "CLUB" ? entityId : null,
    organizer_id: accountType === "ORGANIZADOR" ? entityId : null,
    event_type: "PLAN_CHANGED_MANUAL",
    from_plan_id: fromPlanId,
    to_plan_id: planId,
    payment_status_after: currentStatus,
  });
  if (eventError) throw new Error(eventError.message);
}
