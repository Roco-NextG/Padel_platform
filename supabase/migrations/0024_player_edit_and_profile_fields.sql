-- ============================================================================
-- Padel Platform — Migración 0024: editar jugadores + email nativo + dirección
--
-- Contexto: players.email nunca existió como columna propia — el email
-- mostrado en Jugadores venía SIEMPRE de auth.users vía join por user_id, y
-- casi todos los jugadores creados desde el wizard de inscripción tienen
-- user_id = null (no tienen cuenta). Eso hacía imposible pedir/editar un
-- email al crear o editar un jugador. Se agrega email como columna propia
-- de players, independiente de auth — coalesce(p.email, u.email) en los
-- RPCs de lectura para no perder el email de jugadores que sí tienen cuenta
-- vinculada.
--
-- clubs.address / organizers.address: el mockup (padel-platform.html,
-- vista Club/Organizador) pide "Dirección" y no existía ninguna columna
-- para eso.
-- ============================================================================

alter table public.players add column if not exists email text;
alter table public.clubs add column if not exists address text;
alter table public.organizers add column if not exists address text;

-- ---------------------------------------------------------------------------
-- fetch_visible_players / search_players_for_enrollment: mismo cuerpo que
-- 0019/0015, solo cambia la columna de email a coalesce(p.email, u.email).
-- ---------------------------------------------------------------------------
create or replace function public.fetch_visible_players()
returns table (
  player_id uuid,
  first_name text,
  last_name text,
  phone text,
  email text,
  current_rating numeric,
  current_rating_deviation numeric,
  category smallint,
  gender public.gender_type
) as $$
begin
  return query
  select p.id, p.first_name, p.last_name, p.phone, coalesce(p.email, u.email::text),
         p.current_rating, p.current_rating_deviation, p.category, p.gender
  from public.players p
  left join auth.users u on u.id = p.user_id
  where public.is_admin()
     or p.user_id = auth.uid()
     or exists (
       select 1 from public.roster_memberships rm
       where rm.player_id = p.id
         and (
           public.is_club(rm.club_id)
           or public.is_organizer(rm.organizer_id)
           or (
             rm.club_id is not null and exists (
               select 1 from public.tournaments t
               where t.club_id = rm.club_id and t.organizer_id is not null and public.is_organizer(t.organizer_id)
             )
           )
         )
     )
  order by p.first_name;
end;
$$ language plpgsql security definer;

create or replace function public.search_players_for_enrollment(p_tournament_id uuid, p_query text)
returns table (
  player_id uuid, first_name text, last_name text, email text,
  gender public.gender_type, category smallint
) as $$
begin
  if not public.is_tournament_manager(p_tournament_id) then
    raise exception 'search_players_for_enrollment: no administras este torneo';
  end if;

  return query
  select p.id, p.first_name, p.last_name, coalesce(p.email, u.email::text), p.gender, p.category
  from public.players p
  left join auth.users u on u.id = p.user_id
  where (p.first_name ilike '%' || p_query || '%' or p.last_name ilike '%' || p_query || '%' or u.email ilike '%' || p_query || '%' or p.email ilike '%' || p_query || '%')
    and exists (
      select 1 from public.roster_memberships rm
      join public.tournaments t on t.id = p_tournament_id
      where rm.player_id = p.id
        and (
          rm.club_id = t.club_id
          or (t.organizer_id is not null and rm.organizer_id = t.organizer_id)
        )
    )
  order by p.first_name
  limit 20;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- create_player_for_enrollment: se agregan p_phone/p_email opcionales
-- (default null) — mismo signature base, así que llamadas viejas con 4
-- argumentos siguen funcionando sin cambios.
-- ---------------------------------------------------------------------------
create or replace function public.create_player_for_enrollment(
  p_first_name text, p_last_name text, p_gender public.gender_type, p_category smallint,
  p_phone text default null, p_email text default null
)
returns public.players as $$
declare
  v_player public.players;
  v_club_id uuid;
  v_organizer_id uuid;
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

  insert into public.players (user_id, first_name, last_name, gender, category, phone, email)
  values (null, trim(p_first_name), coalesce(trim(p_last_name), ''), p_gender, p_category, nullif(trim(coalesce(p_phone, '')), ''), nullif(trim(coalesce(p_email, '')), ''))
  returning * into v_player;

  select club_id, organizer_id into v_club_id, v_organizer_id
  from public.role_assignments
  where user_id = auth.uid() and role in ('CLUB', 'ORGANIZADOR')
  limit 1;

  if v_club_id is not null or v_organizer_id is not null then
    insert into public.roster_memberships (player_id, club_id, organizer_id)
    values (v_player.id, v_club_id, v_organizer_id)
    on conflict (player_id, club_id, organizer_id) do nothing;
  end if;

  return v_player;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- create_player: alta de jugador SIN torneo de contexto — para el botón
-- "+ Nuevo jugador" de la sección Jugadores. Mismo gate que
-- create_player_for_enrollment (is_tournament_staff), género queda
-- opcional (a diferencia del wizard de inscripción, acá no hace falta para
-- ninguna validación de categoría en el momento de crear).
-- ---------------------------------------------------------------------------
create or replace function public.create_player(
  p_first_name text, p_last_name text, p_email text, p_phone text, p_category smallint,
  p_gender public.gender_type default null
)
returns public.players as $$
declare
  v_player public.players;
  v_club_id uuid;
  v_organizer_id uuid;
begin
  if not public.is_tournament_staff() then
    raise exception 'create_player: no tienes permiso';
  end if;
  if p_first_name is null or length(trim(p_first_name)) = 0 then
    raise exception 'create_player: se requiere first_name';
  end if;
  if p_last_name is null or length(trim(p_last_name)) = 0 then
    raise exception 'create_player: se requiere last_name';
  end if;
  if p_category is null or p_category < 1 or p_category > 7 then
    raise exception 'create_player: category debe estar entre 1 y 7';
  end if;

  insert into public.players (user_id, first_name, last_name, email, phone, category, gender)
  values (null, trim(p_first_name), trim(p_last_name), nullif(trim(coalesce(p_email, '')), ''), nullif(trim(coalesce(p_phone, '')), ''), p_category, p_gender)
  returning * into v_player;

  select club_id, organizer_id into v_club_id, v_organizer_id
  from public.role_assignments
  where user_id = auth.uid() and role in ('CLUB', 'ORGANIZADOR')
  limit 1;

  if v_club_id is not null or v_organizer_id is not null then
    insert into public.roster_memberships (player_id, club_id, organizer_id)
    values (v_player.id, v_club_id, v_organizer_id)
    on conflict (player_id, club_id, organizer_id) do nothing;
  end if;

  return v_player;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- update_player: edición general — permitido si sos admin, sos el propio
-- jugador (user_id = auth.uid()), o administrás algún club/organizador que
-- tenga a este jugador en su roster (mismo criterio de management que el
-- resto de las mutaciones de esta tabla, sin la rama extra de "visible por
-- ser el torneo alojado" que fetch_visible_players sí tiene para LECTURA).
-- ---------------------------------------------------------------------------
create or replace function public.update_player(
  p_player_id uuid, p_first_name text, p_last_name text, p_email text, p_phone text,
  p_category smallint, p_gender public.gender_type
)
returns public.players as $$
declare
  v_player public.players;
  v_can_manage boolean;
begin
  if p_first_name is null or length(trim(p_first_name)) = 0 then
    raise exception 'update_player: se requiere first_name';
  end if;
  if p_last_name is null or length(trim(p_last_name)) = 0 then
    raise exception 'update_player: se requiere last_name';
  end if;
  if p_category is not null and (p_category < 1 or p_category > 7) then
    raise exception 'update_player: category debe estar entre 1 y 7';
  end if;

  select exists (
    select 1 from public.players p
    where p.id = p_player_id
      and (
        public.is_admin()
        or p.user_id = auth.uid()
        or exists (
          select 1 from public.roster_memberships rm
          where rm.player_id = p.id
            and (public.is_club(rm.club_id) or public.is_organizer(rm.organizer_id))
        )
      )
  ) into v_can_manage;

  if not v_can_manage then
    raise exception 'update_player: no tienes permiso sobre este jugador';
  end if;

  update public.players
  set first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      email = nullif(trim(coalesce(p_email, '')), ''),
      phone = nullif(trim(coalesce(p_phone, '')), ''),
      category = p_category,
      gender = p_gender
  where id = p_player_id
  returning * into v_player;

  return v_player;
end;
$$ language plpgsql security definer;

grant execute on function public.create_player(text, text, text, text, smallint, public.gender_type) to authenticated;
grant execute on function public.update_player(uuid, text, text, text, text, smallint, public.gender_type) to authenticated;
