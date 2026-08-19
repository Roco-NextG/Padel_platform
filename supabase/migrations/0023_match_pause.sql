-- ============================================================================
-- Padel Platform — Migración 0023: pausar un partido en vivo
-- (redesign/partidos-vivo, prompt 5 — decisión tomada con el usuario:
-- booleano sobre IN_PROGRESS, no un valor nuevo de MatchStatus, para no
-- tocar canTransition() ni el resto de la máquina de estados del Match
-- Engine, que queda protegida en este prompt).
-- ============================================================================

alter table public.matches
  add column is_paused boolean not null default false;

-- Solo tiene sentido pausado sobre un partido en curso — evita que quede
-- "colgado" en true si el partido avanza a CONFIRMED/CANCELLED sin pasar
-- por un resume() explícito.
alter table public.matches
  add constraint matches_is_paused_only_in_progress
  check (not is_paused or status = 'IN_PROGRESS');

-- matches_write (0009_repair_tournament_rls.sql) ya cubre esta columna:
-- es "for all" sobre is_tournament_manager(tournament_id), sin lista de
-- columnas — pausar/reanudar es un UPDATE directo, no necesita RPC nueva.
