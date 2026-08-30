-- Padel Platform — Migración 0022: corrige submit_match_result para partidos pausados
--
-- Bug real encontrado al verificar en vivo "mostrar partidos finalizados": la
-- función original (0016_bracket_and_match_rpcs.sql) actualiza status a
-- CONFIRMED/PENDING_CONFIRMATION pero nunca resetea is_paused a false. Si el
-- partido estaba pausado (is_paused=true, típico: el organizador pausa para
-- terminar de cargar el marcador con calma), el UPDATE viola el check
-- constraint matches_is_paused_only_in_progress (0011_matches_schema.sql:
-- "not is_paused or status = 'IN_PROGRESS'") y el resultado nunca se guarda.
--
-- Único cambio respecto a la versión de 0016: agregar is_paused = false a
-- ambos UPDATE. Resto de la lógica sin modificar.

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
