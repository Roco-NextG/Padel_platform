-- ============================================================================
-- Padel Platform — Migración 0027: RLS de ligas + extender matches/teams/
-- submit_match_result para que un partido de Liga funcione con la MISMA
-- infraestructura que un partido de Torneo.
-- ============================================================================

create or replace function public.is_league_manager(target_league_id uuid) returns boolean as $$
  select public.is_admin() or exists (
    select 1 from public.leagues l
    where l.id = target_league_id
      and (
        (l.organizer_id is null and public.is_club(l.club_id))
        or (l.organizer_id is not null and public.is_organizer(l.organizer_id))
      )
  );
$$ language sql stable security definer;

alter table public.leagues enable row level security;

create policy leagues_select on public.leagues for select
  using (is_published = true or public.is_league_manager(id));

create policy leagues_insert on public.leagues for insert
  with check (
    public.is_admin()
    or (organizer_id is null and public.is_club(club_id))
    or (organizer_id is not null and public.is_organizer(organizer_id))
  );

create policy leagues_update on public.leagues for update
  using (public.is_league_manager(id)) with check (public.is_league_manager(id));

alter table public.league_categories enable row level security;

create policy league_categories_select on public.league_categories for select
  using (
    exists (
      select 1 from public.leagues l
      where l.id = league_id and (l.is_published or public.is_league_manager(l.id))
    )
  );
create policy league_categories_write on public.league_categories for all
  using (public.is_league_manager(league_id)) with check (public.is_league_manager(league_id));

alter table public.league_rounds enable row level security;

create policy league_rounds_select on public.league_rounds for select
  using (
    exists (
      select 1 from public.league_categories c join public.leagues l on l.id = c.league_id
      where c.id = category_id and (l.is_published or public.is_league_manager(l.id))
    )
  );
create policy league_rounds_write on public.league_rounds for all
  using (exists (select 1 from public.league_categories c where c.id = category_id and public.is_league_manager(c.league_id)))
  with check (exists (select 1 from public.league_categories c where c.id = category_id and public.is_league_manager(c.league_id)));

-- ---------------------------------------------------------------------------
-- teams — teams_select/teams_write (0010) solo conocían tournament_category_id;
-- se reemplazan por versiones que aceptan cualquiera de los dos.
-- ---------------------------------------------------------------------------
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select
  using (
    (tournament_category_id is null and league_category_id is null)
    or exists (
      select 1 from public.tournament_categories c join public.tournaments t on t.id = c.tournament_id
      where c.id = tournament_category_id and (t.is_published or public.is_tournament_manager(t.id))
    )
    or exists (
      select 1 from public.league_categories c join public.leagues l on l.id = c.league_id
      where c.id = league_category_id and (l.is_published or public.is_league_manager(l.id))
    )
  );

drop policy if exists teams_write on public.teams;
create policy teams_write on public.teams for all
  using (
    (tournament_category_id is not null
      and exists (select 1 from public.tournament_categories c where c.id = tournament_category_id and public.is_tournament_manager(c.tournament_id)))
    or (league_category_id is not null
      and exists (select 1 from public.league_categories c where c.id = league_category_id and public.is_league_manager(c.league_id)))
  )
  with check (
    (tournament_category_id is not null
      and exists (select 1 from public.tournament_categories c where c.id = tournament_category_id and public.is_tournament_manager(c.tournament_id)))
    or (league_category_id is not null
      and exists (select 1 from public.league_categories c where c.id = league_category_id and public.is_league_manager(c.league_id)))
  );

-- team_members_select/write (0010) ya pasan por teams sin mencionar
-- tournament_category_id directamente — heredan el cambio de arriba sin
-- tocarlas.

-- ---------------------------------------------------------------------------
-- matches/set_scores — matches_write (0012) exigía tournament_id not null;
-- se agrega la rama league_id en select/write, misma forma que arriba.
-- ---------------------------------------------------------------------------
drop policy if exists matches_select on public.matches;
create policy matches_select on public.matches for select
  using (
    (tournament_id is null and league_id is null)
    or exists (select 1 from public.tournaments t where t.id = tournament_id and (t.is_published or public.is_tournament_manager(t.id)))
    or exists (select 1 from public.leagues l where l.id = league_id and (l.is_published or public.is_league_manager(l.id)))
  );

drop policy if exists matches_write on public.matches;
create policy matches_write on public.matches for all
  using (
    (tournament_id is not null and public.is_tournament_manager(tournament_id))
    or (league_id is not null and public.is_league_manager(league_id))
  )
  with check (
    (tournament_id is not null and public.is_tournament_manager(tournament_id))
    or (league_id is not null and public.is_league_manager(league_id))
  );

drop policy if exists set_scores_select on public.set_scores;
create policy set_scores_select on public.set_scores for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (
        (m.tournament_id is null and m.league_id is null)
        or exists (select 1 from public.tournaments t where t.id = m.tournament_id and (t.is_published or public.is_tournament_manager(t.id)))
        or exists (select 1 from public.leagues l where l.id = m.league_id and (l.is_published or public.is_league_manager(l.id)))
      )
    )
  );

drop policy if exists set_scores_write on public.set_scores;
create policy set_scores_write on public.set_scores for all
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and ((m.tournament_id is not null and public.is_tournament_manager(m.tournament_id))
          or (m.league_id is not null and public.is_league_manager(m.league_id)))
    )
  )
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and ((m.tournament_id is not null and public.is_tournament_manager(m.tournament_id))
          or (m.league_id is not null and public.is_league_manager(m.league_id)))
    )
  );

-- ---------------------------------------------------------------------------
-- submit_match_result (0016, parcheado en 0022) — el gate p_by_organizer
-- solo aceptaba tournament_id. Único cambio real: la condición de permiso;
-- el resto de la función es idéntico a 0022.
-- ---------------------------------------------------------------------------
create or replace function public.submit_match_result(
  p_match_id uuid, p_sets jsonb, p_winner text, p_by_organizer boolean
)
returns public.matches as $$
declare
  v_match public.matches;
  v_winner_team_id uuid;
  v_set jsonb;
  v_is_admin_resolution boolean;
begin
  select * into v_match from public.matches where id = p_match_id;
  if v_match.id is null then
    raise exception 'submit_match_result: match % no existe', p_match_id;
  end if;
  if p_winner not in ('A', 'B') then
    raise exception 'submit_match_result: p_winner debe ser ''A'' o ''B''';
  end if;

  v_is_admin_resolution := v_match.status = 'DISPUTED' and public.is_admin();

  if p_by_organizer then
    if not (
      (v_match.tournament_id is not null and public.is_tournament_manager(v_match.tournament_id))
      or (v_match.league_id is not null and public.is_league_manager(v_match.league_id))
    ) then
      raise exception 'submit_match_result: no administras el torneo o liga de este partido';
    end if;
  elsif v_is_admin_resolution then
    null;
  else
    if not public.is_match_participant(p_match_id) then
      raise exception 'submit_match_result: no eres jugador de este partido';
    end if;
  end if;

  if not (v_match.status in ('SCHEDULED', 'IN_PROGRESS') or v_is_admin_resolution) then
    raise exception 'submit_match_result: el partido % está en estado % — no se puede registrar un resultado nuevo desde ahí', p_match_id, v_match.status;
  end if;

  v_winner_team_id := case p_winner when 'A' then v_match.team_a_id else v_match.team_b_id end;
  if v_winner_team_id is null then
    raise exception 'submit_match_result: el partido no tiene ambos equipos asignados';
  end if;

  delete from public.set_scores where match_id = p_match_id;
  delete from public.match_confirmations where match_id = p_match_id;

  for v_set in select * from jsonb_array_elements(p_sets)
  loop
    insert into public.set_scores (match_id, set_number, team_a_games, team_b_games, tiebreak_a, tiebreak_b)
    values (p_match_id, (v_set->>'setNumber')::int, (v_set->>'teamAGames')::int, (v_set->>'teamBGames')::int,
      (v_set->>'tiebreakA')::int, (v_set->>'tiebreakB')::int);
  end loop;

  if p_by_organizer or v_is_admin_resolution then
    update public.matches set status = 'CONFIRMED', winner_team_id = v_winner_team_id, is_paused = false where id = p_match_id
      returning * into v_match;
  else
    update public.matches set status = 'PENDING_CONFIRMATION', winner_team_id = v_winner_team_id, is_paused = false where id = p_match_id
      returning * into v_match;

    insert into public.match_confirmations (match_id, player_id, confirmed, confirmed_at)
    select p_match_id, p.id, true, now() from public.players p where p.user_id = auth.uid();
  end if;

  insert into public.audit_log (actor_user_id, entity_type, entity_id, action, after)
  values (auth.uid(), 'match', p_match_id, 'SUBMIT_RESULT', to_jsonb(v_match));

  return v_match;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- search_players_for_league_enrollment — mismo criterio que
-- search_players_for_enrollment (0015), pero resolviendo club/organizer_id
-- a través de leagues en vez de tournaments. create_player_for_enrollment/
-- get_players_by_ids/assign_player_category (0015) ya son genéricas
-- (is_tournament_staff() no depende de un torneo puntual) — se reutilizan
-- tal cual para inscripción de Liga, sin ninguna versión propia.
-- ---------------------------------------------------------------------------
create or replace function public.search_players_for_league_enrollment(p_league_id uuid, p_query text)
returns table (
  player_id uuid, first_name text, last_name text, email text,
  gender public.gender_type, category smallint
) as $$
begin
  if not public.is_league_manager(p_league_id) then
    raise exception 'search_players_for_league_enrollment: no administras esta liga';
  end if;

  return query
  select p.id, p.first_name, p.last_name, u.email::text, p.gender, p.category
  from public.players p
  left join auth.users u on u.id = p.user_id
  where (p.first_name ilike '%' || p_query || '%' or p.last_name ilike '%' || p_query || '%' or u.email ilike '%' || p_query || '%')
    and exists (
      select 1 from public.roster_memberships rm
      join public.leagues l on l.id = p_league_id
      where rm.player_id = p.id
        and (
          rm.club_id = l.club_id
          or (l.organizer_id is not null and rm.organizer_id = l.organizer_id)
        )
    )
  order by p.first_name
  limit 20;
end;
$$ language plpgsql security definer;
