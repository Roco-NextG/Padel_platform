-- ============================================================================
-- Padel Platform — Migración 0029: logo/portada de Liga
--
-- Mismo patrón que tournaments.logo_url/cover_image_url (0009 + bucket en
-- 0023). El bucket 'tournament-branding' ya existe y su policy de escritura
-- está gateada por is_tournament_staff() — genérica, sin chequeo de
-- pertenencia por carpeta — así que se reutiliza tal cual para Liga
-- (prefijo de carpeta `league-<id>/...`, ver leagueRepository.ts). No hace
-- falta un bucket ni políticas nuevas.
-- ============================================================================

alter table public.leagues add column logo_url text;
alter table public.leagues add column cover_image_url text;
