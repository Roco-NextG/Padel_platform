-- ============================================================================
-- Padel Platform — Migración 0007: Match Engine (submit_match_result real +
-- sincronización de confirmaciones)
--
-- Completa el stub de submit_match_result que quedó pendiente en
-- 0002_rls.sql ("pendiente de implementar en Fase 6 — Match Engine").
--
-- La validación real del resultado (formato de scoring contra
-- tournaments.scoring_config, ganador matemáticamente consistente) vive en
-- @padel-platform/match-engine — lógica pura en TypeScript, sin dependencias
-- de base de datos — y corre en la capa de aplicación ANTES de llamar a esta
-- función. Igual que record_rating_events con @padel-platform/rating-engine,
-- esta RPC nunca reimplementa esa validación: confía en que el caller ya
-- ejecutó validateMatchResult() y solo llega aquí un resultado ya válido. El
-- trabajo de esta función es autorización + persistencia + transición de
-- estado + auditoría — no reglas de scoring.
--
-- Dos caminos que conviven (docs/06_MATCH_ENGINE.md §3):
--   - Organizador (p_by_organizer = true): CONFIRMED directo, sin pasar por
--     confirmación de jugadores.
--   - Jugador: PENDING_CONFIRMATION; el propio jugador que registra queda
--     auto-confirmado. Los otros 3 NO se pre-crean como filas en
--     match_confirmations — la ausencia de fila ES el estado "pendiente".
--     (La columna `confirmed` es `boolean not null` en 0001_schema.sql, sin
--     hueco para un tercer valor "null = todavía no respondió" como en el
--     tipo PlayerConfirmation del paquete; se modela como "no hay fila
--     todavía" en vez de forzar un booleano a significar tres cosas.)
--   - Admin resolviendo un partido DISPUTED: mismo camino que organizador
--     (reemplaza los sets y confirma), permitido cuando status = DISPUTED y
--     el caller es admin — docs/06_MATCH_ENGINE.md §3: "Solo el
--     organizador/admin puede resolver un partido en DISPUTED".
--
-- La confirmación/rechazo de cada jugador (fuera de esta función) se hace
-- con un INSERT/UPDATE directo a match_confirmations desde el cliente — la
-- RLS `match_confirmations_write` (owns_player) ya lo permite, no hace falta
-- una RPC para eso. El trigger `sync_match_status_from_confirmations` de
-- abajo agrega esas confirmaciones y decide CONFIRMED/DISPUTED — mismo
-- patrón que 0005 (garantía dura como trigger de tabla, no repetida por cada
-- camino de escritura).
-- ============================================================================

create or replace function public.submit_match_result(
  p_match_id uuid,
  p_sets jsonb, -- [{ "setNumber": 1, "teamAGames": 6, "teamBGames": 4, "tiebreakA": null, "tiebreakB": null }, ...]
  p_winner text, -- 'A' | 'B'
  p_by_organizer boolean
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
    null; -- autorizado como admin resolviendo la disputa
  else
    if not public.is_match_participant(p_match_id) then
      raise exception 'submit_match_result: no eres jugador de este partido';
    end if;
  end if;

  if not (v_match.status in ('SCHEDULED', 'IN_PROGRESS') or v_is_admin_resolution) then
    raise exception
      'submit_match_result: el partido % está en estado % — no se puede registrar un resultado nuevo desde ahí',
      p_match_id, v_match.status;
  end if;

  v_winner_team_id := case p_winner when 'A' then v_match.team_a_id else v_match.team_b_id end;
  if v_winner_team_id is null then
    raise exception 'submit_match_result: el partido no tiene ambos equipos asignados';
  end if;

  -- Reemplaza cualquier set/confirmación previa — relevante en la
  -- resolución de un DISPUTED por admin, donde se vuelve a registrar desde cero.
  delete from public.set_scores where match_id = p_match_id;
  delete from public.match_confirmations where match_id = p_match_id;

  for v_set in select * from jsonb_array_elements(p_sets)
  loop
    insert into public.set_scores (match_id, set_number, team_a_games, team_b_games, tiebreak_a, tiebreak_b)
    values (
      p_match_id,
      (v_set->>'setNumber')::int,
      (v_set->>'teamAGames')::int,
      (v_set->>'teamBGames')::int,
      (v_set->>'tiebreakA')::int,
      (v_set->>'tiebreakB')::int
    );
  end loop;

  if p_by_organizer or v_is_admin_resolution then
    update public.matches
      set status = 'CONFIRMED', winner_team_id = v_winner_team_id
      where id = p_match_id
      returning * into v_match;
  else
    update public.matches
      set status = 'PENDING_CONFIRMATION', winner_team_id = v_winner_team_id
      where id = p_match_id
      returning * into v_match;

    insert into public.match_confirmations (match_id, player_id, confirmed, confirmed_at)
    select p_match_id, p.id, true, now()
    from public.players p
    where p.user_id = auth.uid();
  end if;

  insert into public.audit_log (actor_user_id, entity_type, entity_id, action, after)
  values (auth.uid(), 'match', p_match_id, 'SUBMIT_RESULT', to_jsonb(v_match));

  return v_match;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- Sincroniza matches.status a partir de match_confirmations
-- (docs/06_MATCH_ENGINE.md §3, §7): cualquier rechazo explícito -> DISPUTED;
-- los 4 jugadores confirmaron -> CONFIRMED; si no, no toca el status (ya
-- quedó en PENDING_CONFIRMATION desde submit_match_result). Misma regla que
-- computeConfirmationStatus del paquete, expresada de nuevo aquí porque este
-- trigger corre en un camino de escritura directo del cliente donde la capa
-- de aplicación TypeScript no está en medio para llamar a esa función.
-- ---------------------------------------------------------------------------
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
  from public.team_members tm
  where tm.team_id in (v_match.team_a_id, v_match.team_b_id);

  select
    count(*) filter (where mc.confirmed = true),
    count(*) filter (where mc.confirmed = false)
    into v_confirmed_count, v_rejected_count
  from public.match_confirmations mc
  where mc.match_id = v_match.id and mc.player_id = any(v_player_ids);

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
