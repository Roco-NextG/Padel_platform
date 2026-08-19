-- ============================================================================
-- Padel Platform — Migración 0019: Player.category
-- (docs/11_UX_HANDOFF.md §4, decisión #7 — resuelta)
--
-- category es un campo PROPIO, entero 1-7 (1 = mejor), independiente de
-- Player.current_rating. El rating mide desempeño real dentro de la
-- plataforma (Rating Engine, Glicko-2); category es una clasificación
-- administrativa que se declara explícitamente al dar de alta al jugador
-- (autoregistro o alta manual por un organizador) — NUNCA se calcula ni se
-- deriva de current_rating. Son conceptos distintos que conviven.
--
-- NULLABLE a propósito: los jugadores que ya existen en la base no tienen
-- valor todavía y no se hace backfill forzado — la regla de elegibilidad de
-- Crear Torneo exige asignarla en el momento en que se intenta inscribir una
-- pareja con un jugador sin category, no bloquea nada más mientras tanto.
-- ============================================================================

alter table public.players
  add column if not exists category smallint;

alter table public.players
  add constraint players_category_range check (category is null or (category between 1 and 7));

comment on column public.players.category is
  'Categoría declarada del jugador (1=mejor .. 7), independiente de current_rating. Nunca se calcula.';
