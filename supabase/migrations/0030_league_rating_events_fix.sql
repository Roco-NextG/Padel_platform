-- ============================================================================
-- Padel Platform — Migración 0030: corrige record_rating_events y
-- rating_events_select para partidos de Liga
--
-- Bug real encontrado al verificar en vivo "cargar resultado de un partido
-- de Liga": record_rating_events (0014) exigía tournament_id not null
-- incondicionalmente — un resultado de Liga se guardaba en matches/
-- set_scores (submit_match_result, ya corregido en 0027) pero el cálculo
-- de rating fallaba después con "no tienes permiso sobre el partido",
-- dejando el partido CONFIRMED sin ratings actualizados.
-- ============================================================================

drop policy if exists rating_events_select on public.rating_events;
create policy rating_events_select on public.rating_events for select
  using (
    public.owns_player(player_id)
    or public.is_admin()
    or exists (
      select 1 from public.matches m
      where m.id = match_id
        and ((m.tournament_id is not null and public.is_tournament_manager(m.tournament_id))
          or (m.league_id is not null and public.is_league_manager(m.league_id)))
    )
  );

create or replace function public.record_rating_events(p_events jsonb)
returns setof public.rating_events as $$
declare
  v_event jsonb;
  v_match public.matches;
  v_inserted public.rating_events;
  v_player_id uuid;
  v_partner_id uuid;
  v_player_team_id uuid;
  v_distinct_match_id uuid;
begin
  for v_distinct_match_id in
    select distinct (e->>'matchId')::uuid from jsonb_array_elements(p_events) as e
  loop
    if exists (select 1 from public.rating_events where match_id = v_distinct_match_id and not superseded) then
      raise exception 'record_rating_events: el partido % ya tiene eventos de rating registrados', v_distinct_match_id;
    end if;
  end loop;

  for v_event in select * from jsonb_array_elements(p_events)
  loop
    select * into v_match from public.matches where id = (v_event->>'matchId')::uuid;

    if v_match.id is null then
      raise exception 'record_rating_events: match % no existe', v_event->>'matchId';
    end if;
    if v_match.status <> 'CONFIRMED' then
      raise exception 'record_rating_events: el partido % no está CONFIRMED (status actual: %)', v_match.id, v_match.status;
    end if;
    if not (
      (v_match.tournament_id is not null and public.is_tournament_manager(v_match.tournament_id))
      or (v_match.league_id is not null and public.is_league_manager(v_match.league_id))
      or public.is_admin()
      or public.is_match_participant(v_match.id)
    ) then
      raise exception 'record_rating_events: no tienes permiso sobre el partido %', v_match.id;
    end if;

    v_player_id := (v_event->>'playerId')::uuid;
    v_partner_id := nullif(v_event->>'partnerId', '')::uuid;

    select team_id into v_player_team_id from public.team_members
    where player_id = v_player_id and team_id in (v_match.team_a_id, v_match.team_b_id);
    if v_player_team_id is null then
      raise exception 'record_rating_events: el jugador % no participó en el partido %', v_player_id, v_match.id;
    end if;

    if v_partner_id is not null then
      if v_partner_id = v_player_id or not exists (select 1 from public.team_members where player_id = v_partner_id and team_id = v_player_team_id) then
        raise exception 'record_rating_events: % no es el compañero de % en el partido %', v_partner_id, v_player_id, v_match.id;
      end if;
    end if;

    insert into public.rating_events (player_id, match_id, partner_id, old_rating, new_rating, old_rd, new_rd, reason, algorithm_version, created_by)
    values (
      v_player_id, (v_event->>'matchId')::uuid, v_partner_id,
      (v_event->>'oldRating')::numeric, (v_event->>'newRating')::numeric,
      (v_event->>'oldRD')::numeric, (v_event->>'newRD')::numeric,
      (v_event->>'reason')::public.rating_reason, v_event->>'algorithmVersion', auth.uid()
    )
    returning * into v_inserted;

    update public.players set current_rating = v_inserted.new_rating, current_rating_deviation = v_inserted.new_rd
      where id = v_inserted.player_id;

    insert into public.audit_log (actor_user_id, entity_type, entity_id, action, after)
    values (auth.uid(), 'rating_event', v_inserted.id, 'CREATE', to_jsonb(v_inserted));

    return next v_inserted;
  end loop;

  return;
end;
$$ language plpgsql security definer;
