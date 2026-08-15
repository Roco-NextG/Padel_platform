-- ============================================================================
-- Padel Platform — Migración 0006: GRANT base para anon/authenticated
--
-- Gap encontrado al probar 0001-0005 contra el proyecto Supabase real via
-- REST API: todas las tablas devolvían 401 "permission denied for table X"
-- (código 42501) en vez de aplicar RLS. No es un problema de policy — es que
-- ninguna migración anterior le dio a los roles `anon`/`authenticated` el
-- GRANT de tabla de Postgres.
--
-- RLS y GRANT son dos capas distintas: GRANT decide si el rol puede siquiera
-- intentar la operación sobre la tabla; RLS decide qué filas ve/toca dentro
-- de esa operación ya permitida. Sin el GRANT, Postgres rechaza la consulta
-- antes de llegar a evaluar ninguna policy — por eso 0001-0005 (que sí
-- crean el schema, las policies y las funciones correctamente, verificado
-- contra Postgres real) fallaban igual en el proyecto real: cuando se crean
-- tablas por SQL crudo (SQL Editor) en vez del flujo estándar de Supabase,
-- los roles anon/authenticated no reciben el GRANT automáticamente.
--
-- Esta migración NO abre ningún acceso nuevo — todo lo que expone sigue
-- filtrado por las policies de 0002/0005 (verificado: tras aplicar este
-- GRANT, un INSERT directo a `rating_events` como `authenticated` sigue
-- rechazado por RLS, no por permisos). Solo destraba la capa de Postgres
-- que tiene que pasar primero para que RLS pueda hacer su trabajo.
--
-- No depende de tablas específicas por nombre (usa ALL TABLES IN SCHEMA), así
-- que no hay que repetir esto cuando lleguen tournaments/matches/etc. — pero
-- si algún día se crea una tabla nueva y aparece el mismo 401, es la primera
-- sospecha: correr este GRANT de nuevo cubre también las tablas nuevas
-- gracias al ALTER DEFAULT PRIVILEGES.
-- ============================================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
