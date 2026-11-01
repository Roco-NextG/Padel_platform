-- ============================================================================
-- Padel Platform — Migración 0036: duración promedio de partido por torneo
--
-- Hasta ahora el planificador asumía 60 minutos fijos para todo torneo
-- (MATCH_DURATION_MINUTES hardcodeado en apps/web). Pedido explícito: que
-- cada torneo pueda configurar su propia duración promedio, y que el
-- planificador la use para calcular el horario de fin al programar un
-- partido. Default 60 para no cambiar el comportamiento de los torneos
-- existentes.
-- ============================================================================

alter table public.tournaments
  add column match_duration_minutes smallint not null default 60
    constraint tournaments_match_duration_minutes_range check (match_duration_minutes between 15 and 240);
