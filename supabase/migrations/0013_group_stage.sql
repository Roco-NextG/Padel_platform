-- ============================================================================
-- Padel Platform — Migración 0013: soporte para fase de grupos
--
-- La formación de grupos, la actualización de teams.group_id y la creación
-- de los Match de grupo son, igual que la generación del cuadro directo,
-- siempre disparadas por el organizador — RLS ya las cubre sin necesidad de
-- RPC nueva (tournament_groups_write y matches_write ya exigen
-- is_tournament_manager, ver 0002_rls.sql). Este único cambio de esquema es
-- el flag que decide, al cerrar inscripciones, si una categoría arma grupos
-- primero o va directo al cuadro — no puede inferirse de la existencia de
-- TournamentGroup porque hace falta ANTES de crear el primero.
-- ============================================================================

alter table public.tournament_categories
  add column if not exists uses_group_stage boolean not null default false;
