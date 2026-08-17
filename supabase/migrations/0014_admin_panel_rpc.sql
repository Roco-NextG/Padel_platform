-- ============================================================================
-- Padel Platform — Migración 0014: Admin panel — búsqueda de usuarios,
-- otorgar/revocar roles, y un fix real encontrado en el camino.
--
-- BUG PREEXISTENTE ENCONTRADO (no introducido en esta migración, ya estaba
-- en 0001_schema.sql): la constraint `unique (user_id, role, club_id,
-- organizer_id)` de user_roles no protege nada para roles GLOBALES (donde
-- club_id y organizer_id son ambos NULL) — en SQL estándar, NULL nunca se
-- considera igual a otro NULL a efectos de UNIQUE, así que dos filas
-- idénticas con ambas columnas en NULL no disparan conflicto. Confirmado:
-- otorgar el mismo rol global (ej. ADMIN) dos veces insertaba dos filas.
-- Fix: recrear el índice con NULLS NOT DISTINCT (Postgres 15+), que trata
-- todos los NULL de esas columnas como iguales entre sí para la constraint.
-- ============================================================================

alter table public.user_roles drop constraint if exists user_roles_user_id_role_club_id_organizer_id_key;

create unique index if not exists user_roles_user_role_scope_unique
  on public.user_roles (user_id, role, club_id, organizer_id)
  nulls not distinct;

-- ---------------------------------------------------------------------------
-- Búsqueda de usuarios por email — auth.users no es consultable directo
-- desde el cliente (no está en el esquema expuesto por PostgREST), así que
-- el admin panel necesita una función que sí pueda leerlo.
-- ---------------------------------------------------------------------------
create or replace function public.admin_search_users(p_query text)
returns table (
  user_id uuid,
  email text,
  player_id uuid,
  first_name text,
  last_name text
) as $$
begin
  if not public.is_admin() then
    raise exception 'admin_search_users: no tienes permiso';
  end if;

  return query
  select u.id, u.email, p.id, p.first_name, p.last_name
  from auth.users u
  left join public.players p on p.user_id = u.id
  where u.email ilike '%' || p_query || '%'
  order by u.email
  limit 20;
end;
$$ language plpgsql security definer stable;

-- ---------------------------------------------------------------------------
-- Otorgar un rol — idempotente (llamar dos veces con los mismos parámetros
-- no crea una fila duplicada, gracias al índice corregido arriba).
-- ---------------------------------------------------------------------------
create or replace function public.admin_grant_role(
  p_user_id uuid,
  p_role app_role,
  p_club_id uuid default null,
  p_organizer_id uuid default null
)
returns public.user_roles as $$
declare
  v_result public.user_roles;
begin
  if not public.is_admin() then
    raise exception 'admin_grant_role: no tienes permiso';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'admin_grant_role: el usuario % no existe', p_user_id;
  end if;

  if p_role in ('CLUB_OWNER', 'CLUB_MANAGER') and p_club_id is null then
    raise exception 'admin_grant_role: % requiere club_id', p_role;
  end if;

  if p_club_id is not null and not exists (select 1 from public.clubs where id = p_club_id) then
    raise exception 'admin_grant_role: el club % no existe', p_club_id;
  end if;

  if p_organizer_id is not null and not exists (select 1 from public.organizers where id = p_organizer_id) then
    raise exception 'admin_grant_role: el organizador % no existe', p_organizer_id;
  end if;

  insert into public.user_roles (user_id, role, club_id, organizer_id)
  values (p_user_id, p_role, p_club_id, p_organizer_id)
  on conflict (user_id, role, club_id, organizer_id) do update
    set role = excluded.role -- no-op, mismo valor; solo para que RETURNING funcione también en el caso ya existente
  returning * into v_result;

  insert into public.audit_log (actor_user_id, entity_type, entity_id, action, after)
  values (auth.uid(), 'user_role', v_result.id, 'GRANT_ROLE', to_jsonb(v_result));

  return v_result;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- Revocar un rol.
-- ---------------------------------------------------------------------------
create or replace function public.admin_revoke_role(p_role_id uuid)
returns void as $$
declare
  v_before public.user_roles;
begin
  if not public.is_admin() then
    raise exception 'admin_revoke_role: no tienes permiso';
  end if;

  select * into v_before from public.user_roles where id = p_role_id;
  if v_before.id is null then
    raise exception 'admin_revoke_role: el rol % no existe', p_role_id;
  end if;

  delete from public.user_roles where id = p_role_id;

  insert into public.audit_log (actor_user_id, entity_type, entity_id, action, before)
  values (auth.uid(), 'user_role', p_role_id, 'REVOKE_ROLE', to_jsonb(v_before));
end;
$$ language plpgsql security definer;
