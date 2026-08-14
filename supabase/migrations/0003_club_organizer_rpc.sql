-- ============================================================================
-- Padel Platform — Migración 0003: creación de club vía RPC
--
-- Gap detectado al construir el CRUD de Club (Fase 4): `clubs_insert` exige
-- que el caller ya tenga el rol CLUB_OWNER (0002_rls.sql), pero
-- `user_roles_write` solo permite escribir a un admin. Sin esta función,
-- nadie podría nunca convertirse en dueño de su primer club aunque un admin
-- ya le haya otorgado CLUB_OWNER de forma global (club_id null): el INSERT en
-- `clubs` funcionaría, pero no habría manera de que ese mismo usuario
-- quedara luego con permiso de `is_club_manager` sobre el club recién creado
-- (eso requeriría una fila en user_roles con club_id = ese club, y esa tabla
-- es de escritura exclusiva de admin).
--
-- Se resuelve siguiendo el mismo patrón ya establecido en 0002_rls.sql para
-- `submit_match_result`: una función `security definer` que valida el mismo
-- requisito que ya exigía la policy (CLUB_OWNER global o admin), inserta el
-- club, y de forma atómica otorga al creador el rol CLUB_OWNER acotado a ese
-- club_id específico — sin abrir ninguna política nueva de escritura directa
-- sobre `clubs` ni `user_roles`. No modifica ninguna policy existente.
-- ============================================================================

create or replace function public.create_club(
  p_name text,
  p_city text default null,
  p_address text default null,
  p_branding jsonb default '{}'::jsonb
)
returns public.clubs as $$
declare
  v_club public.clubs;
begin
  if not (public.has_role('CLUB_OWNER') or public.is_admin()) then
    raise exception 'create_club: se requiere el rol CLUB_OWNER (otorgado por un admin) para crear un club';
  end if;

  insert into public.clubs (name, city, address, branding)
  values (p_name, p_city, p_address, p_branding)
  returning * into v_club;

  insert into public.user_roles (user_id, role, club_id)
  values (auth.uid(), 'CLUB_OWNER', v_club.id)
  on conflict (user_id, role, club_id, organizer_id) do nothing;

  insert into public.audit_log (actor_user_id, entity_type, entity_id, action, after)
  values (auth.uid(), 'club', v_club.id, 'CREATE', to_jsonb(v_club));

  return v_club;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- update_club_branding: mismo dato que clubs_update ya permite vía RLS
-- directa (public.is_club_manager(id)), envuelto en RPC solo para dejar
-- registro en audit_log (docs/03_DATABASE_SCHEMA.md §6: obligatorio en
-- escrituras de Club) sin duplicar esa lógica de auditoría en cada policy.
-- ---------------------------------------------------------------------------
create or replace function public.update_club_branding(
  p_club_id uuid,
  p_branding jsonb
)
returns public.clubs as $$
declare
  v_before public.clubs;
  v_after public.clubs;
begin
  if not public.is_club_manager(p_club_id) then
    raise exception 'update_club_branding: no tienes permiso sobre este club';
  end if;

  select * into v_before from public.clubs where id = p_club_id;

  update public.clubs set branding = p_branding where id = p_club_id
  returning * into v_after;

  insert into public.audit_log (actor_user_id, entity_type, entity_id, action, before, after)
  values (auth.uid(), 'club', p_club_id, 'UPDATE_BRANDING', to_jsonb(v_before), to_jsonb(v_after));

  return v_after;
end;
$$ language plpgsql security definer;
