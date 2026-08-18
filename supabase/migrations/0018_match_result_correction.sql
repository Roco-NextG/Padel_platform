-- ============================================================================
-- Padel Platform — Migración 0018: corrección de resultado ya confirmado
-- (docs/05_RATING_ENGINE.md §8)
--
-- ALCANCE (dejado explícito a propósito): esta función corrige el resultado
-- de UN partido ya CONFIRMED y recalcula SUS PROPIOS rating_events usando el
-- rating ACTUAL de los 4 jugadores como base. NO repropaga automáticamente
-- a otros partidos posteriores que esos jugadores hayan jugado desde
-- entonces (eso requeriría encontrar y recalcular en cadena, en orden
-- cronológico, potencialmente decenas de partidos de otros torneos —
-- @padel-platform/rating-engine ya expone replayRatingHistory() para ese
-- caso completo, pero conectarlo es trabajo aparte, deliberadamente fuera
-- de este alcance). Para el volumen actual (plataforma nueva, correcciones
-- esperadas poco después de jugarse el partido, no meses de historial
-- acumulado encima), esto cubre el caso real sin construir la pieza más
-- compleja todavía.
--
-- Igual que 0004/0008/0010: la validación de scoring (¿es un 6-4 válido?)
-- y el cálculo del nuevo rating (Glicko-2 + efecto compañero) NO se
-- reimplementan en SQL — pasan por match-engine y rating-engine en la capa
-- de aplicación antes de llamar a esta función. Esta función solo persiste
-- el resultado, con las mismas guardas de integridad que ya existen en
-- record_rating_events (jugador/compañero deben pertenecer al partido).
-- ============================================================================

create or replace function public.apply_match_correction(
  p_match_id uuid,
  p_sets jsonb,           -- [{setNumber, teamAGames, teamBGames, tiebreakA?, tiebreakB?}, ...]
  p_winner_team_id uuid,
  p_rating_events jsonb   -- [{playerId, partnerId?, oldRating, newRating, oldRD, newRD, reason, algorithmVersion}, ...]
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
    raise exception
      'apply_match_correction: el partido % no está CONFIRMED (usa submit_match_result para partidos sin confirmar todavía)',
      p_match_id;
  end if;

  if p_winner_team_id not in (v_before.team_a_id, v_before.team_b_id) then
    raise exception 'apply_match_correction: el ganador debe ser uno de los dos equipos del partido';
  end if;

  v_events_count := coalesce(jsonb_array_length(p_rating_events), 0);
  if v_events_count = 0 then
    raise exception 'apply_match_correction: se requiere al menos un rating event recalculado';
  end if;

  -- Reemplazar los sets del partido por los corregidos.
  delete from public.set_scores where match_id = p_match_id;
  for v_set in select * from jsonb_array_elements(p_sets)
  loop
    insert into public.set_scores (match_id, set_number, team_a_games, team_b_games, tiebreak_a, tiebreak_b)
    values (
      p_match_id,
      (v_set->>'setNumber')::int,
      (v_set->>'teamAGames')::int,
      (v_set->>'teamBGames')::int,
      nullif(v_set->>'tiebreakA', '')::int,
      nullif(v_set->>'tiebreakB', '')::int
    );
  end loop;

  update public.matches set winner_team_id = p_winner_team_id where id = p_match_id
  returning * into v_result;

  -- Cadena de corrección: los eventos viejos quedan superseded (nunca se
  -- borran, ver docs/05_RATING_ENGINE.md §8), y el índice único parcial de
  -- 0008 (where not superseded) permite que los nuevos ocupen el mismo
  -- (player_id, match_id) sin chocar.
  update public.rating_events set superseded = true
  where match_id = p_match_id and not superseded;

  for v_event in select * from jsonb_array_elements(p_rating_events)
  loop
    v_player_id := (v_event->>'playerId')::uuid;
    v_partner_id := nullif(v_event->>'partnerId', '')::uuid;

    -- Misma guarda de integridad que record_rating_events (0008/0010):
    -- el jugador debe haber sido realmente parte de este partido.
    select team_id into v_player_team_id
    from public.team_members
    where player_id = v_player_id and team_id in (v_before.team_a_id, v_before.team_b_id);

    if v_player_team_id is null then
      raise exception
        'apply_match_correction: el jugador % no participó en el partido %', v_player_id, p_match_id;
    end if;

    if v_partner_id is not null then
      if v_partner_id = v_player_id or not exists (
        select 1 from public.team_members
        where player_id = v_partner_id and team_id = v_player_team_id
      ) then
        raise exception
          'apply_match_correction: % no es el compañero de % en el partido %',
          v_partner_id, v_player_id, p_match_id;
      end if;
    end if;

    insert into public.rating_events (
      player_id, match_id, partner_id, old_rating, new_rating, old_rd, new_rd,
      reason, algorithm_version, created_by
    ) values (
      v_player_id,
      p_match_id,
      v_partner_id,
      (v_event->>'oldRating')::numeric,
      (v_event->>'newRating')::numeric,
      (v_event->>'oldRD')::numeric,
      (v_event->>'newRD')::numeric,
      (v_event->>'reason')::rating_reason,
      v_event->>'algorithmVersion',
      auth.uid()
    )
    returning * into v_inserted;

    update public.players
      set current_rating = v_inserted.new_rating, current_rating_deviation = v_inserted.new_rd
      where id = v_inserted.player_id;
  end loop;

  insert into public.audit_log (actor_user_id, entity_type, entity_id, action, before, after)
  values (auth.uid(), 'match', p_match_id, 'CORRECT_RESULT', to_jsonb(v_before), to_jsonb(v_result));

  return v_result;
end;
$$ language plpgsql security definer;
