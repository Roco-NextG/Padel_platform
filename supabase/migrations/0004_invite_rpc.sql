-- ============================================================================
-- Padel Platform — Migración 0004: redeem_invite()
--
-- El invitado ya tiene sesión (Supabase Auth ya validó el link de invitación
-- y creó/confirmó su auth.users) — esta RPC solo adjunta el role_assignment
-- correspondiente a la invitación PENDING más reciente de este usuario y la
-- marca ACCEPTED. Mismo patrón security definer + auditable que
-- admin_grant_role/admin_revoke_role del esquema anterior, a menor escala.
-- ============================================================================

create or replace function public.redeem_invite() returns public.role_assignments as $$
declare
  v_invite public.pending_invites;
  v_result public.role_assignments;
begin
  select * into v_invite from public.pending_invites
  where auth_user_id = auth.uid() and status = 'PENDING' and expires_at > now()
  order by created_at desc
  limit 1;

  if v_invite.id is null then
    raise exception 'redeem_invite: no hay una invitación pendiente válida';
  end if;

  insert into public.role_assignments (user_id, role, club_id, organizer_id)
  values (auth.uid(), v_invite.role, v_invite.club_id, v_invite.organizer_id)
  on conflict (user_id, role, club_id, organizer_id) do nothing
  returning * into v_result;

  update public.pending_invites set status = 'ACCEPTED', accepted_at = now()
  where id = v_invite.id;

  return v_result;
end;
$$ language plpgsql security definer;

grant execute on function public.redeem_invite() to authenticated;
