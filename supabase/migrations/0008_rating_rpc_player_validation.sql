-- ============================================================================
-- Padel Platform — Migración 0008: integridad de record_rating_events
--
-- Gap encontrado al probar 0004_rating_rpc.sql contra Postgres real:
-- la función valida que el partido esté CONFIRMED y que quien llama gestione
-- el torneo, pero NO valida que el `playerId` de cada evento haya sido
-- realmente miembro de team_a/team_b de ESE partido. Un organizador (con
-- permisos legítimos sobre su propio torneo) podía registrar un RatingEvent
-- para cualquier jugador de la plataforma, no solo los 4 que jugaron.
-- Reproducido: un jugador ajeno al partido recibió un evento sin error.
--
-- Fix: por cada evento, exigir que playerId sea team_member de team_a_id o
-- team_b_id del match, y que partnerId (si viene) sea el OTRO miembro del
-- MISMO equipo — usa la tabla team_members que ya existe, sin esquema nuevo.
--
-- Segundo gap encontrado al trazar la integración completa del Match Engine
-- (0007_match_engine_rpc.sql, camino de confirmación de jugadores): no hay
-- nada que impida llamar record_rating_events dos veces para el mismo
-- partido (doble clic, reintento de red, o dos confirmaciones casi
-- simultáneas que ambas ven el match ya CONFIRMED). rating_events no tiene
-- constraint de unicidad por match_id, y recordRatingEventsForMatch() relee
-- el rating ACTUAL antes de calcular — una segunda llamada no duplicaría el
-- mismo delta, aplicaría un segundo ajuste sobre el ya corregido.
--
-- El fix real es una constraint de unicidad (player_id, match_id): un
-- chequeo EXISTS antes del loop (ver más abajo) dejaría pasar dos llamadas
-- verdaderamente concurrentes (ninguna ve el commit de la otra todavía —
-- clásica condición de carrera check-then-insert). La constraint es lo
-- único que Postgres garantiza correcto bajo concurrencia real: la segunda
-- transacción espera el commit de la primera y falla con unique_violation.
-- El EXISTS que sigue existiendo es solo para dar un mensaje de error legible
-- en el caso común (secuencial), no la garantía de fondo.
--
-- OJO: es un ÍNDICE ÚNICO PARCIAL (`where not superseded`), no una
-- constraint UNIQUE lisa — rating_events.superseded (0001_schema.sql) existe
-- exactamente para el recalculo histórico de docs/05_RATING_ENGINE.md §8:
-- corregir un resultado marca los eventos viejos como superseded e inserta
-- eventos NUEVOS para el mismo (player_id, match_id). Una constraint UNIQUE
-- sin el `where` habría bloqueado ese flujo para siempre, aunque todavía no
-- esté construido — hay que dejarle el camino libre, no cerrarlo por
-- adelantado con esta migración.
--
-- De paso, endurece el GRANT de 0006 para `anon`: no necesita insert/update/
-- delete en ninguna tabla (todo su acceso real es de lectura pública vía
-- RLS), así que se lo dejamos solo en SELECT. No cambia ningún
-- comportamiento observable — RLS ya bloqueaba esas escrituras para anon
-- (auth.uid() es null sin sesión) — es defensa en profundidad, no un fix de
-- un bug explotable.
-- ============================================================================

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
  -- IDEMPOTENCIA: se valida UNA SOLA VEZ, antes de insertar nada, sobre
  -- todos los match_id distintos del batch — si esto viviera dentro del
  -- loop principal, el evento 2 vería la fila que insertó el evento 1 en
  -- la misma transacción (visible dentro de la propia transacción) y se
  -- rechazaría a sí mismo.
  for v_distinct_match_id in
    select distinct (e->>'matchId')::uuid from jsonb_array_elements(p_events) as e
  loop
    if exists (
      select 1 from public.rating_events
      where match_id = v_distinct_match_id and not superseded
    ) then
      raise exception
        'record_rating_events: el partido % ya tiene eventos de rating registrados', v_distinct_match_id;
    end if;
  end loop;

  for v_event in select * from jsonb_array_elements(p_events)
  loop
    select * into v_match from public.matches where id = (v_event->>'matchId')::uuid;

    if v_match.id is null then
      raise exception 'record_rating_events: match % no existe', v_event->>'matchId';
    end if;

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

    v_player_id := (v_event->>'playerId')::uuid;
    v_partner_id := nullif(v_event->>'partnerId', '')::uuid;

    -- INTEGRIDAD: playerId debe haber jugado efectivamente este partido.
    select team_id into v_player_team_id
    from public.team_members
    where player_id = v_player_id
      and team_id in (v_match.team_a_id, v_match.team_b_id);

    if v_player_team_id is null then
      raise exception
        'record_rating_events: el jugador % no participó en el partido %', v_player_id, v_match.id;
    end if;

    -- INTEGRIDAD: partnerId (si viene) debe ser el otro miembro del MISMO equipo.
    if v_partner_id is not null then
      if v_partner_id = v_player_id or not exists (
        select 1 from public.team_members
        where player_id = v_partner_id and team_id = v_player_team_id
      ) then
        raise exception
          'record_rating_events: % no es el compañero de % en el partido %',
          v_partner_id, v_player_id, v_match.id;
      end if;
    end if;

    insert into public.rating_events (
      player_id, match_id, partner_id,
      old_rating, new_rating, old_rd, new_rd,
      reason, algorithm_version, created_by
    ) values (
      v_player_id,
      (v_event->>'matchId')::uuid,
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

-- Garantía real contra condiciones de carrera (ver nota arriba) — este es
-- el que blinda la idempotencia bajo concurrencia, no el EXISTS del principio
-- de la función. Parcial (`where not superseded`) para no bloquear el
-- recalculo histórico documentado en 05_RATING_ENGINE.md §8, todavía no
-- construido.
drop index if exists rating_events_player_match_active_unique;
create unique index rating_events_player_match_active_unique
  on public.rating_events (player_id, match_id)
  where not superseded;

-- Endurecimiento defensa-en-profundidad del GRANT de anon (ver nota arriba).
revoke insert, update, delete on all tables in schema public from anon;
alter default privileges in schema public revoke insert, update, delete on tables from anon;
