-- ============================================================================
-- Padel Platform — Migración 0021: RPCs de inscripción (paso 4 de Crear
-- Torneo, docs/11_UX_HANDOFF.md §3.6)
--
-- players_select (0002_rls.sql) solo deja ver un Player si public_profile=
-- true, es el propio jugador, o el caller es admin — un organizador/club
-- normal no puede buscar jugadores por nombre/email para inscribirlos, y
-- players_insert exige user_id = auth.uid(), así que tampoco puede crear un
-- jugador nuevo (user_id NULL, "importado", ya contemplado en el schema).
--
-- En vez de abrir players_select/insert/update en general (lo que dejaría a
-- cualquier organizador leer/escribir CUALQUIER Player desde cualquier
-- lugar de la app, no solo desde este flujo), se agregan 3 funciones
-- security definer de alcance chico — mismo criterio que admin_search_users/
-- admin_grant_role (0014): la tabla players en sí no se toca, todo pasa por
-- acá. La búsqueda además necesita leer auth.users.email, que el cliente
-- jamás puede consultar directo vía PostgREST sin importar RLS — otra razón
-- por la que esto tiene que ser una función server-side, igual que
-- admin_search_users.
-- ============================================================================

create or replace function public.is_tournament_staff()
returns boolean as $$
  select public.is_admin() or exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('CLUB_OWNER', 'CLUB_MANAGER', 'ORGANIZER', 'TOURNAMENT_STAFF')
  );
$$ language sql stable security definer;

-- Busca por nombre O email (players sin user_id no tienen email — el ilike
-- contra u.email simplemente no matchea para esos, no rompe nada).
create or replace function public.search_players_for_enrollment(p_query text)
returns table (
  player_id uuid, first_name text, last_name text, email text,
  gender public.gender_type, category smallint
) as $$
begin
  if not public.is_tournament_staff() then
    raise exception 'search_players_for_enrollment: no tienes permiso';
  end if;

  return query
  select p.id, p.first_name, p.last_name, u.email::text, p.gender, p.category
  from public.players p
  left join auth.users u on u.id = p.user_id
  where p.first_name ilike '%' || p_query || '%'
     or p.last_name ilike '%' || p_query || '%'
     or u.email ilike '%' || p_query || '%'
  order by p.first_name
  limit 20;
end;
$$ language plpgsql security definer;

-- Alta manual "sin salir del flujo" (paso 4) — jugador importado, sin
-- cuenta propia (user_id NULL, mismo patrón que el resto del schema).
create or replace function public.create_player_for_enrollment(
  p_first_name text, p_last_name text, p_gender public.gender_type, p_category smallint
)
returns public.players as $$
declare
  v_player public.players;
begin
  if not public.is_tournament_staff() then
    raise exception 'create_player_for_enrollment: no tienes permiso';
  end if;
  if p_category is null or p_category < 1 or p_category > 7 then
    raise exception 'create_player_for_enrollment: category debe estar entre 1 y 7';
  end if;
  if p_first_name is null or length(trim(p_first_name)) = 0 then
    raise exception 'create_player_for_enrollment: se requiere first_name';
  end if;

  insert into public.players (user_id, first_name, last_name, gender, category)
  values (null, trim(p_first_name), coalesce(trim(p_last_name), ''), p_gender, p_category)
  returning * into v_player;

  return v_player;
end;
$$ language plpgsql security definer;

-- Revalidación server-side antes del INSERT en Team (docs/11_UX_HANDOFF.md
-- §4 #9: "el server no debería confiar ciegamente" en el gender/category que
-- mandó el cliente) — sin esto, la única forma de re-leer estos dos campos
-- sería un select directo a players, que players_select (0002_rls.sql)
-- rechaza para un organizador no-admin.
create or replace function public.get_players_by_ids(p_player_ids uuid[])
returns table (player_id uuid, gender public.gender_type, category smallint) as $$
begin
  if not public.is_tournament_staff() then
    raise exception 'get_players_by_ids: no tienes permiso';
  end if;

  return query
  select p.id, p.gender, p.category
  from public.players p
  where p.id = any(p_player_ids);
end;
$$ language plpgsql security definer;

-- Solo RELLENA una category faltante (docs/11_UX_HANDOFF.md §4 #7: la
-- edición general de category de un jugador YA asignado no es parte de este
-- flujo — va en el rediseño de Jugadores). Rechaza explícitamente si el
-- jugador ya tiene category, en vez de sobreescribirla en silencio.
create or replace function public.assign_player_category(p_player_id uuid, p_category smallint)
returns public.players as $$
declare
  v_player public.players;
begin
  if not public.is_tournament_staff() then
    raise exception 'assign_player_category: no tienes permiso';
  end if;
  if p_category is null or p_category < 1 or p_category > 7 then
    raise exception 'assign_player_category: category debe estar entre 1 y 7';
  end if;

  select * into v_player from public.players where id = p_player_id;
  if v_player.id is null then
    raise exception 'assign_player_category: el jugador % no existe', p_player_id;
  end if;
  if v_player.category is not null then
    raise exception 'assign_player_category: el jugador % ya tiene categoría asignada', p_player_id;
  end if;

  update public.players set category = p_category where id = p_player_id
  returning * into v_player;

  return v_player;
end;
$$ language plpgsql security definer;
