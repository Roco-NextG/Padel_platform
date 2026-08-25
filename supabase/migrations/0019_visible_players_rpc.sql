-- ============================================================================
-- Padel Platform — Migración 0019: fetch_visible_players()
--
-- La pantalla Jugadores (Ranking + directorio de contacto) necesita email,
-- que vive en auth.users — PostgREST nunca expone esa tabla directo, así
-- que hace falta una función security definer con el join, mismo patrón que
-- search_players_for_enrollment (0015). A diferencia de esa RPC (scopeada a
-- UN torneo puntual), esta es "todo lo que esta cuenta puede ver" — mismo
-- criterio de visibilidad que players_select (0010_tournament_rls.sql),
-- espejado acá a propósito (no se puede reusar la policy directo desde una
-- función) para que el join con auth.users pueda pasar.
-- ============================================================================

create or replace function public.fetch_visible_players()
returns table (
  player_id uuid,
  first_name text,
  last_name text,
  phone text,
  email text,
  current_rating numeric,
  current_rating_deviation numeric,
  category smallint,
  gender public.gender_type
) as $$
begin
  return query
  select p.id, p.first_name, p.last_name, p.phone, u.email::text,
         p.current_rating, p.current_rating_deviation, p.category, p.gender
  from public.players p
  left join auth.users u on u.id = p.user_id
  where public.is_admin()
     or p.user_id = auth.uid()
     or exists (
       select 1 from public.roster_memberships rm
       where rm.player_id = p.id
         and (
           public.is_club(rm.club_id)
           or public.is_organizer(rm.organizer_id)
           or (
             rm.club_id is not null and exists (
               select 1 from public.tournaments t
               where t.club_id = rm.club_id and t.organizer_id is not null and public.is_organizer(t.organizer_id)
             )
           )
         )
     )
  order by p.first_name;
end;
$$ language plpgsql security definer;

grant execute on function public.fetch_visible_players() to authenticated;
