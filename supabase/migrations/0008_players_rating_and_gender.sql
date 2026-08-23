-- ============================================================================
-- Padel Platform — Migración 0008: rating, categoría y género en players
--
-- El players placeholder de 0002_schema.sql (id/user_id/first_name/
-- last_name/is_active/phone) le faltaba todo lo que el motor de torneos y
-- el wizard de inscripción necesitan: rating/RD para el Rating Engine, y
-- gender para la auto-clasificación de categoría al inscribir una pareja
-- (docs/11_UX_HANDOFF.md §3.6 del proyecto original: "Masculina si ambos
-- son hombres... Mixta si uno de cada uno"). category es declarado por el
-- club/organizador al inscribir, nunca derivado de current_rating — mismo
-- criterio que el esquema viejo.
-- ============================================================================

create type public.gender_type as enum ('MALE', 'FEMALE', 'OTHER', 'MIXED');
-- MIXED incluido desde el día 1 (a diferencia del esquema viejo, que lo
-- agregó en una migración aparte, 0020_gender_type_mixed.sql) — solo tiene
-- sentido en tournament_categories.gender_restriction (una pareja con un
-- jugador de cada género), nunca en players.gender de una persona real.

alter table public.players
  add column current_rating numeric(5,2),
  add column current_rating_deviation numeric(6,2),
  add column category smallint,
  add column gender public.gender_type,
  add constraint players_category_range check (category is null or category between 1 and 7);
