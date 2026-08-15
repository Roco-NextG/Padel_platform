-- ============================================================================
-- Padel Platform — Migración 0011: persistencia del avance de bracket
--
-- La colocación de ganadores en la siguiente ronda (qué casilla, qué lado)
-- es lógica pura ya implementada y testeada en
-- @padel-platform/tournament-engine (bracketProgression.ts:
-- initializeBracketRounds/advanceBracket/isMatchReady/isFinalRound) — esta
-- migración NO la reimplementa. Su único trabajo es la escritura: la capa
-- de aplicación (TypeScript) calcula CON esas funciones qué Match hay que
-- crear o si el torneo terminó, y estas dos RPC solo persisten ese
-- resultado con la autorización correcta.
--
-- Por qué hace falta una RPC (no un INSERT/UPDATE directo vía RLS): la
-- generación inicial del cuadro siempre la dispara el organizador (pasa
-- is_tournament_manager sin problema, matches_write ya se lo permite), pero
-- el AVANCE tras confirmar un partido puede dispararlo el organizador
-- (camino submit_match_result) O el jugador cuya confirmación fue la última
-- en completar el partido (camino sync_match_status_from_confirmations,
-- 0007) — igual que el gap que 0010 cerró en record_rating_events. Ese
-- jugador no administra el torneo, así que un UPDATE/INSERT directo sobre
-- matches/tournaments fallaría por RLS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- create_bracket_match: crea el Match de la ronda siguiente una vez que
-- ambos lados del cruce están resueltos. Idempotente a propósito — dos
-- confirmaciones casi simultáneas que alimentan el mismo cruce (ej. un bye
-- y un partido real resolviéndose casi a la vez) pueden calcular esto dos
-- veces; el índice único + ON CONFLICT hace que la segunda llamada
-- simplemente devuelva la fila que la primera ya creó, en vez de fallar.
-- ---------------------------------------------------------------------------
create unique index if not exists matches_phase_round_unique
  on public.matches (phase_id, round_index);

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
begin
  if not (
    public.is_tournament_manager(p_tournament_id)
    or public.is_match_participant(p_completed_match_id)
  ) then
    raise exception 'create_bracket_match: no tienes permiso sobre el torneo %', p_tournament_id;
  end if;

  insert into public.matches (tournament_id, phase_id, round_index, team_a_id, team_b_id, status, match_type)
  values (p_tournament_id, p_phase_id, p_round_index, p_team_a_id, p_team_b_id, 'SCHEDULED', p_match_type)
  on conflict (phase_id, round_index) do update
    set team_a_id = public.matches.team_a_id -- no-op: solo para que RETURNING siempre traiga una fila
  returning * into v_result;

  insert into public.audit_log (actor_user_id, entity_type, entity_id, action, after)
  values (auth.uid(), 'match', v_result.id, 'BRACKET_ADVANCE', to_jsonb(v_result));

  return v_result;
end;
$$ language plpgsql security definer;

-- ---------------------------------------------------------------------------
-- finish_tournament: la ronda que se acaba de confirmar era la final —
-- docs/04_TOURNAMENT_ENGINE.md §8 no pide nada más que el cambio de estado
-- (el ganador ya queda en matches.winner_team_id de la final, sin duplicar).
-- ---------------------------------------------------------------------------
create or replace function public.finish_tournament(
  p_tournament_id uuid,
  p_completed_match_id uuid
)
returns public.tournaments as $$
declare
  v_result public.tournaments;
begin
  if not (
    public.is_tournament_manager(p_tournament_id)
    or public.is_match_participant(p_completed_match_id)
  ) then
    raise exception 'finish_tournament: no tienes permiso sobre el torneo %', p_tournament_id;
  end if;

  update public.tournaments set status = 'FINISHED' where id = p_tournament_id
  returning * into v_result;

  insert into public.audit_log (actor_user_id, entity_type, entity_id, action, after)
  values (auth.uid(), 'tournament', p_tournament_id, 'FINISHED', to_jsonb(v_result));

  return v_result;
end;
$$ language plpgsql security definer;
