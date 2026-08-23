-- ============================================================================
-- Padel Platform — Migración 0018: una categoría por (torneo, nivel, género)
--
-- El paso "Categorías" del wizard es un grid de toggles (nivel 1-7 × género)
-- — sin esta constraint, tocar el mismo toggle dos veces rápido (doble
-- click, retry de red) podría crear dos filas idénticas. level/gender_restriction
-- siempre vienen ambos seteados desde este flujo (nunca null), así que un
-- UNIQUE simple alcanza, sin necesitar NULLS NOT DISTINCT esta vez.
-- ============================================================================

alter table public.tournament_categories
  add constraint tournament_categories_level_gender_unique unique (tournament_id, level, gender_restriction);
