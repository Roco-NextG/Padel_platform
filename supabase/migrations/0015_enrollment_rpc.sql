-- ============================================================================
-- Padel Platform — Migración 0015: RPCs de inscripción (paso 4 de Crear Torneo)
--
-- is_tournament_staff() ya existe desde 0007 (adelantada para courts_select).
--
-- Cambio real respecto al esquema viejo (b0362d4:0021_tournament_enrollment_rpc.sql):
-- search_players_for_enrollment ya NO busca en TODOS los players de la
-- plataforma con el único gate de "sos staff de algún club/organizador" —
-- ahora recibe el torneo y busca solo dentro del roster accesible para ESE
-- torneo (el propio + el del club anfitrión si quien llama es el
-- Organizador), la regla exacta pedida ("el club solo tiene acceso a su
-- propia base de jugadores; el organizador también a la del club que
-- eligió"). create_player_for_enrollment además da de alta al jugador
-- recién creado en el roster de quien lo creó, para que no desaparezca de
-- ahí después del wizard.
-- ============================================================================

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
  select p.id, p.first_name, p.last_name, u.email::text, p.gender, p.category
  from public.players p
  left join auth.users u on u.id = p.user_id
  where (p.first_name ilike '%' || p_query || '%' or p.last_name ilike '%' || p_query || '%' or u.email ilike '%' || p_query || '%')
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

create or replace function public.create_player_for_enrollment(
  p_first_name text, p_last_name text, p_gender public.gender_type, p_category smallint
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

  insert into public.players (user_id, first_name, last_name, gender, category)
  values (null, trim(p_first_name), coalesce(trim(p_last_name), ''), p_gender, p_category)
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
  -- Si quien llama es admin sin rol CLUB/ORGANIZADOR propio, no hay a qué
  -- roster darlo de alta — se crea el jugador igual, sin membership, en vez
  -- de fallar.

  return v_player;
end;
$$ language plpgsql security definer;

create or replace function public.get_players_by_ids(p_player_ids uuid[])
returns table (player_id uuid, gender public.gender_type, category smallint) as $$
begin
  if not public.is_tournament_staff() then
    raise exception 'get_players_by_ids: no tienes permiso';
  end if;

  return query select p.id, p.gender, p.category from public.players p where p.id = any(p_player_ids);
end;
$$ language plpgsql security definer;

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

  update public.players set category = p_category where id = p_player_id returning * into v_player;
  return v_player;
end;
$$ language plpgsql security definer;
