-- ============================================================================
-- Padel Platform — Migración 0035: permite borrar torneos y ligas
--
-- A diferencia de clubs/organizers (que a propósito nunca se borran, solo
-- se desactivan — ver 0003_rls.sql), tournaments y leagues nunca tuvieron
-- ninguna policy de delete simplemente porque la función no existía todavía
-- (pedido explícito ahora). Toda la cadena de abajo (categorías, grupos,
-- fases, teams, matches, rating_events) ya cascadea on delete desde 0009,
-- 0011, 0013, 0017, 0026 — no hace falta tocar nada de eso, con borrar la
-- fila de tournaments/leagues alcanza.
-- ============================================================================

create policy tournaments_delete on public.tournaments for delete
  using (public.is_tournament_manager(id));

create policy leagues_delete on public.leagues for delete
  using (public.is_league_manager(id));
