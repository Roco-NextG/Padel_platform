-- ============================================================================
-- Padel Platform — Migración 0004: persistencia de RatingEvent vía RPC
--
-- El Rating Engine (packages/rating-engine) es lógica pura en TypeScript
-- (Glicko-2 adaptado + efecto compañero, docs/05_RATING_ENGINE.md) — no puede
-- vivir en SQL. `applyMatchResult()` calcula los 4 RatingEventOutput de un
-- partido; esta función es el único punto por el que esos eventos entran a
-- la base de datos.
--
-- Necesaria porque 0002_rls.sql ya deja sin policy de insert/update/delete a
-- `rating_events` para el rol `authenticated` ("solo se escribe vía función
-- security definer" — regla dura: el rating nunca se escribe directo desde
-- el cliente). Sigue el mismo patrón que `submit_match_result` y
-- `create_club`/`update_club_branding` (0003): valida permisos server-side,
-- escribe en una transacción, deja auditoría.
--
-- No modifica ninguna policy existente ni las funciones de 0002/0003.
-- ============================================================================

create or replace function public.record_rating_events(p_events jsonb)
returns setof public.rating_events as $$
declare
  v_event jsonb;
  v_match public.matches;
  v_inserted public.rating_events;
begin
  for v_event in select * from jsonb_array_elements(p_events)
  loop
    select * into v_match from public.matches where id = (v_event->>'matchId')::uuid;

    if v_match.id is null then
      raise exception 'record_rating_events: match % no existe', v_event->>'matchId';
    end if;

    -- Regla dura (docs/05_RATING_ENGINE.md §9): partido no confirmado no genera RatingEvent.
    if v_match.status <> 'CONFIRMED' then
      raise exception
        'record_rating_events: el partido % no está CONFIRMED (status actual: %)',
        v_match.id, v_match.status;
    end if;

    if v_match.tournament_id is null
       or not (public.is_tournament_manager(v_match.tournament_id) or public.is_admin())
    then
      raise exception 'record_rating_events: no tienes permiso sobre el partido %', v_match.id;
    end if;

    insert into public.rating_events (
      player_id, match_id, partner_id,
      old_rating, new_rating, old_rd, new_rd,
      reason, algorithm_version, created_by
    ) values (
      (v_event->>'playerId')::uuid,
      (v_event->>'matchId')::uuid,
      nullif(v_event->>'partnerId', '')::uuid,
      (v_event->>'oldRating')::numeric,
      (v_event->>'newRating')::numeric,
      (v_event->>'oldRD')::numeric,
      (v_event->>'newRD')::numeric,
      (v_event->>'reason')::rating_reason,
      v_event->>'algorithmVersion',
      auth.uid()
    )
    returning * into v_inserted;

    -- player.current_rating/current_rating_deviation son SIEMPRE una
    -- proyección del último RatingEvent (docs/01_ARCHITECTURE.md §6.3) —
    -- este es el único lugar donde se escriben, nunca a mano.
    update public.players
      set current_rating = v_inserted.new_rating,
          current_rating_deviation = v_inserted.new_rd
      where id = v_inserted.player_id;

    insert into public.audit_log (actor_user_id, entity_type, entity_id, action, after)
    values (auth.uid(), 'rating_event', v_inserted.id, 'CREATE', to_jsonb(v_inserted));

    return next v_inserted;
  end loop;

  return;
end;
$$ language plpgsql security definer;
