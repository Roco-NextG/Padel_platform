-- ============================================================================
-- Padel Platform — Migración 0015: fix de tipo en admin_search_users
--
-- Bug encontrado probando el admin panel contra el proyecto real (no se veía
-- en Docker porque ahí no había datos de auth.users para forzar el SELECT):
-- auth.users.email es `character varying(255)` en el esquema de Supabase
-- Auth, no `text`. admin_search_users (0014) declara
-- `returns table (..., email text, ...)`, y RETURNS TABLE exige que el tipo
-- de cada columna proyectada coincida EXACTO con el declarado — varchar(255)
-- no es lo mismo que text para ese chequeo, aunque sean binariamente
-- compatibles. Postgres lo rechaza con:
--   "structure of query does not match function result type:
--    Returned type character varying(255) does not match expected type
--    text in column 2."
-- Fix: castear u.email a text explícitamente en el SELECT.
-- ============================================================================

create or replace function public.admin_search_users(p_query text)
returns table (
  user_id uuid,
  email text,
  player_id uuid,
  first_name text,
  last_name text
) as $$
begin
  if not public.is_admin() then
    raise exception 'admin_search_users: no tienes permiso';
  end if;

  return query
  select u.id, u.email::text, p.id, p.first_name, p.last_name
  from auth.users u
  left join public.players p on p.user_id = u.id
  where u.email ilike '%' || p_query || '%'
  order by u.email
  limit 20;
end;
$$ language plpgsql security definer stable;
