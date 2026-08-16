-- ============================================================================
-- Padel Platform — Migración 0012: integridad de create_bracket_match / finish_tournament
--
-- Gap encontrado al revisar 0011_bracket_rpc.sql: la rama de autorización
-- "OR is_match_participant(p_completed_match_id)" solo confirma que el
-- caller jugó ALGÚN partido — nunca que ese partido tenga relación real con
-- p_tournament_id/p_phase_id/p_team_a_id/p_team_b_id. Un jugador podía usar
-- su propio partido confirmado (de CUALQUIER torneo) como "pase" y crear un
-- Match fraudulento en la fase FINAL de un torneo completamente ajeno.
-- Reproducido: create_bracket_match devolvió una fila insertada de verdad
-- en el torneo víctima. Mismo patrón exacto que cerró 0010 en
-- record_rating_events, aplicado aquí al Tournament Engine.
--
-- Fix, para la rama de jugador (la del organizador ya está bien: su
-- autorización depende directamente de p_tournament_id):
--   1. El partido citado como "pase" debe pertenecer al MISMO p_tournament_id.
--   2. Debe estar CONFIRMED con winner_team_id resuelto.
--   3. Su ganador debe ser uno de los dos equipos que se están colocando
--      (p_team_a_id / p_team_b_id) — no cualquier par arbitrario.
--   4. El OTRO equipo del cruce también debe tener un partido CONFIRMED
--      ganado dentro de ese mismo torneo — no puede ser un equipo inventado.
--   5. p_phase_id debe pertenecer efectivamente a p_tournament_id.
--
-- No se reimplementa la adyacencia exacta del bracket (qué casilla exacta
-- alimenta a cuál) — eso sigue siendo responsabilidad de
-- bracketProgression.ts, con toda su lógica ya testeada. Este fix cierra la
-- inyección cross-torneo y los equipos fabricados, que es lo grave; una
-- verificación de adyacencia exacta en SQL duplicaría esa lógica en dos
-- lugares. Documentado como límite aceptado, no como omisión.
-- ============================================================================

create or replace function public.create_bracket_match(
  p_tournament_id uuid,
  p_phase_id uuid,
  p_round_index int,
  p_team_a_id uuid,
  p_team_b_id uuid,
  p_match_type match_type,
  p_completed_match_id uuid
)
returns public.matches as $$
declare
  v_result public.matches;
  v_completed public.matches;
  v_other_team_id uuid;
begin
  if public.is_tournament_manager(p_tournament_id) then
    null; -- autorización ya ligada directamente a p_tournament_id, sin más checks
  elsif public.is_match_participant(p_completed_match_id) then
    select * into v_completed from public.matches where id = p_completed_match_id;

    if v_completed.id is null or v_completed.tournament_id is distinct from p_tournament_id then
      raise exception
        'create_bracket_match: el partido % no pertenece al torneo %', p_completed_match_id, p_tournament_id;
    end if;

    if v_completed.status <> 'CONFIRMED' or v_completed.winner_team_id is null then
      raise exception 'create_bracket_match: el partido % no está confirmado', p_completed_match_id;
    end if;

    if v_completed.winner_team_id not in (p_team_a_id, p_team_b_id) then
      raise exception
        'create_bracket_match: el ganador de % no coincide con los equipos indicados', p_completed_match_id;
    end if;

    v_other_team_id := case when v_completed.winner_team_id = p_team_a_id then p_team_b_id else p_team_a_id end;
    if not exists (
      select 1 from public.matches
      where tournament_id = p_tournament_id and winner_team_id = v_other_team_id and status = 'CONFIRMED'
    ) then
      raise exception
        'create_bracket_match: % no tiene ningún partido ganado y confirmado en este torneo', v_other_team_id;
    end if;
  else
    raise exception 'create_bracket_match: no tienes permiso sobre el torneo %', p_tournament_id;
  end if;

  if not exists (
    select 1 from public.tournament_phases ph
    join public.tournament_categories c on c.id = ph.category_id
    where ph.id = p_phase_id and c.tournament_id = p_tournament_id
  ) then
    raise exception 'create_bracket_match: la fase % no pertenece al torneo %', p_phase_id, p_tournament_id;
  end if;

  insert into public.matches (tournament_id, phase_id, round_index, team_a_id, team_b_id, status, match_type)
  values (p_tournament_id, p_phase_id, p_round_index, p_team_a_id, p_team_b_id, 'SCHEDULED', p_match_type)
  on conflict (phase_id, round_index) do update
    set team_a_id = public.matches.team_a_id
  returning * into v_result;

  insert into public.audit_log (actor_user_id, entity_type, entity_id, action, after)
  values (auth.uid(), 'match', v_result.id, 'BRACKET_ADVANCE', to_jsonb(v_result));

  return v_result;
end;
$$ language plpgsql security definer;

create or replace function public.finish_tournament(
  p_tournament_id uuid,
  p_completed_match_id uuid
)
returns public.tournaments as $$
declare
  v_result public.tournaments;
  v_completed public.matches;
  v_phase_type phase_type;
begin
  if public.is_tournament_manager(p_tournament_id) then
    null;
  elsif public.is_match_participant(p_completed_match_id) then
    select * into v_completed from public.matches where id = p_completed_match_id;

    if v_completed.id is null or v_completed.tournament_id is distinct from p_tournament_id then
      raise exception
        'finish_tournament: el partido % no pertenece al torneo %', p_completed_match_id, p_tournament_id;
    end if;

    if v_completed.status <> 'CONFIRMED' or v_completed.winner_team_id is null then
      raise exception 'finish_tournament: el partido % no está confirmado', p_completed_match_id;
    end if;

    select ph.type into v_phase_type
    from public.tournament_phases ph
    where ph.id = v_completed.phase_id;

    if v_phase_type is distinct from 'FINAL' then
      raise exception 'finish_tournament: el partido % no es la final del torneo', p_completed_match_id;
    end if;
  else
    raise exception 'finish_tournament: no tienes permiso sobre el torneo %', p_tournament_id;
  end if;

  update public.tournaments set status = 'FINISHED' where id = p_tournament_id
  returning * into v_result;

  insert into public.audit_log (actor_user_id, entity_type, entity_id, action, after)
  values (auth.uid(), 'tournament', p_tournament_id, 'FINISHED', to_jsonb(v_result));

  return v_result;
end;
$$ language plpgsql security definer;
