-- ============================================================================
-- Padel Platform — Migración 0016: submit_match_result, avance de bracket,
-- corrección de resultado
--
-- Las cuatro funciones de este archivo se portan del esquema viejo con
-- CERO cambios en su lógica de validación/negocio — confirmado leyendo cada
-- cuerpo, ninguna referencia directa a user_roles/organizers.user_id, todas
-- pasan por is_tournament_manager/is_match_participant/is_admin, ya
-- reescritos en 0010 contra el modelo nuevo. Se toma la versión final/
-- endurecida de cada una donde el esquema viejo tuvo más de una (
-- create_bracket_match/finish_tournament: la de 0012_bracket_rpc_integrity.sql,
-- que cierra la inyección cross-torneo).
-- ============================================================================

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
    if v_match.tournament_id is null or not public.is_tournament_manager(v_match.tournament_id) then
      raise exception 'submit_match_result: no administras el torneo de este partido';
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
    update public.matches set status = 'CONFIRMED', winner_team_id = v_winner_team_id where id = p_match_id
      returning * into v_match;
  else
    update public.matches set status = 'PENDING_CONFIRMATION', winner_team_id = v_winner_team_id where id = p_match_id
      returning * into v_match;

    insert into public.match_confirmations (match_id, player_id, confirmed, confirmed_at)
    select p_match_id, p.id, true, now() from public.players p where p.user_id = auth.uid();
  end if;

  insert into public.audit_log (actor_user_id, entity_type, entity_id, action, after)
  values (auth.uid(), 'match', p_match_id, 'SUBMIT_RESULT', to_jsonb(v_match));

  return v_match;
end;
$$ language plpgsql security definer;

create or replace function public.sync_match_status_from_confirmations()
returns trigger as $$
declare
  v_match public.matches;
  v_player_ids uuid[];
  v_confirmed_count int;
  v_rejected_count int;
begin
  select * into v_match from public.matches where id = new.match_id;
  if v_match.id is null or v_match.status not in ('PENDING_CONFIRMATION', 'DISPUTED') then
    return new;
  end if;

  select array_agg(distinct tm.player_id) into v_player_ids
  from public.team_members tm where tm.team_id in (v_match.team_a_id, v_match.team_b_id);

  select count(*) filter (where mc.confirmed = true), count(*) filter (where mc.confirmed = false)
    into v_confirmed_count, v_rejected_count
  from public.match_confirmations mc where mc.match_id = v_match.id and mc.player_id = any(v_player_ids);

  if v_rejected_count > 0 then
    update public.matches set status = 'DISPUTED' where id = v_match.id;
    insert into public.audit_log (actor_user_id, entity_type, entity_id, action, after)
    values (auth.uid(), 'match', v_match.id, 'DISPUTED', jsonb_build_object('status', 'DISPUTED'));
  elsif v_confirmed_count > 0 and v_confirmed_count = coalesce(array_length(v_player_ids, 1), 0) then
    update public.matches set status = 'CONFIRMED' where id = v_match.id;
    insert into public.audit_log (actor_user_id, entity_type, entity_id, action, after)
    values (auth.uid(), 'match', v_match.id, 'CONFIRMED', jsonb_build_object('status', 'CONFIRMED'));
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_match_confirmations_sync on public.match_confirmations;
create trigger trg_match_confirmations_sync
  after insert or update on public.match_confirmations
  for each row execute function public.sync_match_status_from_confirmations();

create or replace function public.create_bracket_match(
  p_tournament_id uuid, p_phase_id uuid, p_round_index int,
  p_team_a_id uuid, p_team_b_id uuid, p_match_type public.match_type, p_completed_match_id uuid
)
returns public.matches as $$
declare
  v_result public.matches;
  v_completed public.matches;
  v_other_team_id uuid;
begin
  if public.is_tournament_manager(p_tournament_id) then
    null;
  elsif public.is_match_participant(p_completed_match_id) then
    select * into v_completed from public.matches where id = p_completed_match_id;

    if v_completed.id is null or v_completed.tournament_id is distinct from p_tournament_id then
      raise exception 'create_bracket_match: el partido % no pertenece al torneo %', p_completed_match_id, p_tournament_id;
    end if;
    if v_completed.status <> 'CONFIRMED' or v_completed.winner_team_id is null then
      raise exception 'create_bracket_match: el partido % no está confirmado', p_completed_match_id;
    end if;
    if v_completed.winner_team_id not in (p_team_a_id, p_team_b_id) then
      raise exception 'create_bracket_match: el ganador de % no coincide con los equipos indicados', p_completed_match_id;
    end if;

    v_other_team_id := case when v_completed.winner_team_id = p_team_a_id then p_team_b_id else p_team_a_id end;
    if not exists (select 1 from public.matches where tournament_id = p_tournament_id and winner_team_id = v_other_team_id and status = 'CONFIRMED') then
      raise exception 'create_bracket_match: % no tiene ningún partido ganado y confirmado en este torneo', v_other_team_id;
    end if;
  else
    raise exception 'create_bracket_match: no tienes permiso sobre el torneo %', p_tournament_id;
  end if;

  if not exists (
    select 1 from public.tournament_phases ph join public.tournament_categories c on c.id = ph.category_id
    where ph.id = p_phase_id and c.tournament_id = p_tournament_id
  ) then
    raise exception 'create_bracket_match: la fase % no pertenece al torneo %', p_phase_id, p_tournament_id;
  end if;

  insert into public.matches (tournament_id, phase_id, round_index, team_a_id, team_b_id, status, match_type)
  values (p_tournament_id, p_phase_id, p_round_index, p_team_a_id, p_team_b_id, 'SCHEDULED', p_match_type)
  on conflict (phase_id, round_index) do update set team_a_id = public.matches.team_a_id
  returning * into v_result;

  insert into public.audit_log (actor_user_id, entity_type, entity_id, action, after)
  values (auth.uid(), 'match', v_result.id, 'BRACKET_ADVANCE', to_jsonb(v_result));

  return v_result;
end;
$$ language plpgsql security definer;

create or replace function public.finish_tournament(p_tournament_id uuid, p_completed_match_id uuid)
returns public.tournaments as $$
declare
  v_result public.tournaments;
  v_completed public.matches;
  v_phase_type public.phase_type;
begin
  if public.is_tournament_manager(p_tournament_id) then
    null;
  elsif public.is_match_participant(p_completed_match_id) then
    select * into v_completed from public.matches where id = p_completed_match_id;

    if v_completed.id is null or v_completed.tournament_id is distinct from p_tournament_id then
      raise exception 'finish_tournament: el partido % no pertenece al torneo %', p_completed_match_id, p_tournament_id;
    end if;
    if v_completed.status <> 'CONFIRMED' or v_completed.winner_team_id is null then
      raise exception 'finish_tournament: el partido % no está confirmado', p_completed_match_id;
    end if;

    select ph.type into v_phase_type from public.tournament_phases ph where ph.id = v_completed.phase_id;
    if v_phase_type is distinct from 'FINAL' then
      raise exception 'finish_tournament: el partido % no es la final del torneo', p_completed_match_id;
    end if;
  else
    raise exception 'finish_tournament: no tienes permiso sobre el torneo %', p_tournament_id;
  end if;

  update public.tournaments set status = 'FINISHED' where id = p_tournament_id returning * into v_result;

  insert into public.audit_log (actor_user_id, entity_type, entity_id, action, after)
  values (auth.uid(), 'tournament', p_tournament_id, 'FINISHED', to_jsonb(v_result));

  return v_result;
end;
$$ language plpgsql security definer;

-- apply_match_correction — admin-only, sin dependencia de is_tournament_manager,
-- portada sin ningún cambio.
create or replace function public.apply_match_correction(
  p_match_id uuid, p_sets jsonb, p_winner_team_id uuid, p_rating_events jsonb
)
returns public.matches as $$
declare
  v_before public.matches;
  v_result public.matches;
  v_set jsonb;
  v_event jsonb;
  v_inserted public.rating_events;
  v_player_id uuid;
  v_partner_id uuid;
  v_player_team_id uuid;
  v_events_count int;
begin
  if not public.is_admin() then
    raise exception 'apply_match_correction: solo un admin puede corregir un resultado ya confirmado';
  end if;

  select * into v_before from public.matches where id = p_match_id;
  if v_before.id is null then
    raise exception 'apply_match_correction: el partido % no existe', p_match_id;
  end if;
  if v_before.status <> 'CONFIRMED' then
    raise exception 'apply_match_correction: el partido % no está CONFIRMED (usa submit_match_result para partidos sin confirmar todavía)', p_match_id;
  end if;
  if p_winner_team_id not in (v_before.team_a_id, v_before.team_b_id) then
    raise exception 'apply_match_correction: el ganador debe ser uno de los dos equipos del partido';
  end if;

  v_events_count := coalesce(jsonb_array_length(p_rating_events), 0);
  if v_events_count = 0 then
    raise exception 'apply_match_correction: se requiere al menos un rating event recalculado';
  end if;

  delete from public.set_scores where match_id = p_match_id;
  for v_set in select * from jsonb_array_elements(p_sets)
  loop
    insert into public.set_scores (match_id, set_number, team_a_games, team_b_games, tiebreak_a, tiebreak_b)
    values (p_match_id, (v_set->>'setNumber')::int, (v_set->>'teamAGames')::int, (v_set->>'teamBGames')::int,
      nullif(v_set->>'tiebreakA', '')::int, nullif(v_set->>'tiebreakB', '')::int);
  end loop;

  update public.matches set winner_team_id = p_winner_team_id where id = p_match_id returning * into v_result;

  update public.rating_events set superseded = true where match_id = p_match_id and not superseded;

  for v_event in select * from jsonb_array_elements(p_rating_events)
  loop
    v_player_id := (v_event->>'playerId')::uuid;
    v_partner_id := nullif(v_event->>'partnerId', '')::uuid;

    select team_id into v_player_team_id from public.team_members
    where player_id = v_player_id and team_id in (v_before.team_a_id, v_before.team_b_id);
    if v_player_team_id is null then
      raise exception 'apply_match_correction: el jugador % no participó en el partido %', v_player_id, p_match_id;
    end if;

    if v_partner_id is not null then
      if v_partner_id = v_player_id or not exists (select 1 from public.team_members where player_id = v_partner_id and team_id = v_player_team_id) then
        raise exception 'apply_match_correction: % no es el compañero de % en el partido %', v_partner_id, v_player_id, p_match_id;
      end if;
    end if;

    insert into public.rating_events (player_id, match_id, partner_id, old_rating, new_rating, old_rd, new_rd, reason, algorithm_version, created_by)
    values (
      v_player_id, p_match_id, v_partner_id,
      (v_event->>'oldRating')::numeric, (v_event->>'newRating')::numeric,
      (v_event->>'oldRD')::numeric, (v_event->>'newRD')::numeric,
      (v_event->>'reason')::public.rating_reason, v_event->>'algorithmVersion', auth.uid()
    )
    returning * into v_inserted;

    update public.players set current_rating = v_inserted.new_rating, current_rating_deviation = v_inserted.new_rd
      where id = v_inserted.player_id;
  end loop;

  insert into public.audit_log (actor_user_id, entity_type, entity_id, action, before, after)
  values (auth.uid(), 'match', p_match_id, 'CORRECT_RESULT', to_jsonb(v_before), to_jsonb(v_result));

  return v_result;
end;
$$ language plpgsql security definer;
