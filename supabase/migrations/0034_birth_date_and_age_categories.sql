-- ============================================================================
-- Padel Platform — Migración 0034: fecha de nacimiento + categorías Master/Junior
--
-- birth_date en players: dato nuevo pedido para calcular elegibilidad de
-- categorías por edad (Master 40+, Junior -18). Nullable — no se exige para
-- jugadores ya cargados ni para altas que no compitan en esas categorías.
--
-- min_age/max_age en tournament_categories/league_categories: las
-- categorías "normales" (1ra..7ma, por nivel de juego) no las usan (quedan
-- null); Master/Junior son el primer caso de categoría que depende de edad
-- en vez de nivel — se modela con el mismo "level" de texto libre que ya
-- tiene la columna (hoy guarda "1".."7"; para estas dos pasa a guardar
-- "MASTER"/"JUNIOR"), así no hace falta tocar el constraint de unicidad
-- (tournament_id, level, gender_restriction) de 0018 — "MASTER"+"MALE" y
-- "MASTER"+"FEMALE" son dos filas distintas, como cualquier nivel×género.
-- Junior no restringe género (pedido explícito: "no importa el género"), así
-- que su gender_restriction queda NULL — NO se reutiliza el valor MIXED
-- existente porque esa semántica ya significa "requiere exactamente un
-- hombre y una mujer" (validateTeamGender), que es lo opuesto de "no
-- importa".
-- ============================================================================

alter table public.players add column if not exists birth_date date;
alter table public.tournament_categories
  add column if not exists min_age smallint,
  add column if not exists max_age smallint;
alter table public.league_categories
  add column if not exists min_age smallint,
  add column if not exists max_age smallint;

-- ---------------------------------------------------------------------------
-- RPCs de lectura: mismo cuerpo que la versión anterior, se agrega
-- birth_date a la proyección. Postgres no deja cambiar las columnas de
-- retorno de una función RETURNS TABLE con CREATE OR REPLACE ("cannot
-- change return type of existing function" / "Row type defined by OUT
-- parameters is different") — hay que borrarla primero.
-- ---------------------------------------------------------------------------
drop function if exists public.fetch_visible_players();

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
  gender public.gender_type,
  birth_date date
) as $$
begin
  return query
  select p.id, p.first_name, p.last_name, p.phone, coalesce(p.email, u.email::text),
         p.current_rating, p.current_rating_deviation, p.category, p.gender, p.birth_date
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

-- DROP FUNCTION se lleva puestos los grants existentes — se repone el
-- mismo grant explícito que ya tenía (0019_visible_players_rpc.sql).
grant execute on function public.fetch_visible_players() to authenticated;

drop function if exists public.get_player(uuid);

create or replace function public.get_player(p_player_id uuid)
returns table (
  player_id uuid,
  first_name text,
  last_name text,
  phone text,
  email text,
  current_rating numeric,
  current_rating_deviation numeric,
  category smallint,
  gender public.gender_type,
  birth_date date
) as $$
begin
  return query
  select p.id, p.first_name, p.last_name, p.phone, coalesce(p.email, u.email::text),
         p.current_rating, p.current_rating_deviation, p.category, p.gender, p.birth_date
  from public.players p
  left join auth.users u on u.id = p.user_id
  where p.id = p_player_id
    and (
      public.is_admin()
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
    );
end;
$$ language plpgsql security definer;

grant execute on function public.get_player(uuid) to authenticated;

drop function if exists public.get_players_by_ids(uuid[]);

create or replace function public.get_players_by_ids(p_player_ids uuid[])
returns table (player_id uuid, gender public.gender_type, category smallint, birth_date date) as $$
begin
  if not public.is_tournament_staff() then
    raise exception 'get_players_by_ids: no tienes permiso';
  end if;

  return query select p.id, p.gender, p.category, p.birth_date from public.players p where p.id = any(p_player_ids);
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- RPCs de escritura: se agrega p_birth_date opcional (default null) al
-- final — mismo criterio que p_phone/p_email en 0024, llamadas viejas con
-- menos argumentos siguen funcionando.
-- ---------------------------------------------------------------------------
create or replace function public.create_player_for_enrollment(
  p_first_name text, p_last_name text, p_gender public.gender_type, p_category smallint,
  p_phone text default null, p_email text default null, p_birth_date date default null
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

  insert into public.players (user_id, first_name, last_name, gender, category, phone, email, birth_date)
  values (null, trim(p_first_name), coalesce(trim(p_last_name), ''), p_gender, p_category, nullif(trim(coalesce(p_phone, '')), ''), nullif(trim(coalesce(p_email, '')), ''), p_birth_date)
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

create or replace function public.create_player(
  p_first_name text, p_last_name text, p_email text, p_phone text, p_category smallint,
  p_gender public.gender_type default null, p_birth_date date default null
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

  insert into public.players (user_id, first_name, last_name, email, phone, category, gender, birth_date)
  values (null, trim(p_first_name), trim(p_last_name), nullif(trim(coalesce(p_email, '')), ''), nullif(trim(coalesce(p_phone, '')), ''), p_category, p_gender, p_birth_date)
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

create or replace function public.update_player(
  p_player_id uuid, p_first_name text, p_last_name text, p_email text, p_phone text,
  p_category smallint, p_gender public.gender_type, p_birth_date date default null
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
      gender = p_gender,
      birth_date = p_birth_date
  where id = p_player_id
  returning * into v_player;

  return v_player;
end;
$$ language plpgsql security definer;
