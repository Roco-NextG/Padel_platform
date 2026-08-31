-- ============================================================================
-- Padel Platform — Migración 0025: get_player() — un jugador completo por id
--
-- El panel de inscripciones del torneo (búsqueda/equipos ya inscritos) solo
-- maneja shapes parciales de jugador (sin teléfono, sin rating) — para poder
-- abrir el mismo formulario de edición que usa la sección Jugadores desde
-- ahí, hace falta poder pedir el registro COMPLETO de un jugador puntual
-- por id, con el mismo criterio de visibilidad que fetch_visible_players
-- (0019/0024), sin traer el roster entero.
-- ============================================================================

create or replace function public.get_player(p_player_id uuid)
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
  select p.id, p.first_name, p.last_name, p.phone, coalesce(p.email, u.email::text),
         p.current_rating, p.current_rating_deviation, p.category, p.gender
  from public.players p
  left join auth.users u on u.id = p.user_id
  where p.id = p_player_id
    and (
      public.is_admin()
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
    );
end;
$$ language plpgsql security definer;

grant execute on function public.get_player(uuid) to authenticated;
