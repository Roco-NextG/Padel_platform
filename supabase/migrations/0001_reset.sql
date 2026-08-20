-- ============================================================================
-- Padel Platform — Migración 0001: reset completo del esquema anterior
--
-- El proyecto se reinicia desde el panel de administración hacia afuera
-- (Admin → Club/Organizador → app móvil de Jugador → resto de la web) —
-- las 23 migraciones previas (torneos, partidos, rating, etc.) se tiran
-- porque fueron construidas antes de que existiera el modelo de acceso
-- correcto. Mismo proyecto de Supabase, no uno nuevo: se borra el schema
-- public entero y se reconstruye desde acá.
-- ============================================================================

drop schema public cascade;
create schema public;

grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
