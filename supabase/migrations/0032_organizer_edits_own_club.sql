-- ============================================================================
-- Padel Platform — Migración 0032: el Organizador puede editar (nombre,
-- ciudad y pistas) los clubes que él mismo creó.
--
-- Pedido explícito: "dame la opción de editar los clubes creados por el
-- organizador, por si he cometido un error". clubs_update y courts_write
-- (0003/0007_*.sql) solo dejan escribir a is_club(club_id) — la cuenta CLUB
-- dueña de ese club puntual. Un club creado por un Organizador (0031,
-- created_by_organizer_id) no tiene ninguna cuenta CLUB todavía, así que
-- sin este cambio quedaría, tras crearse, imposible de corregir para
-- cualquiera hasta que un admin lo reclame.
-- ============================================================================

create or replace function public.is_organizer_created_club(target_club_id uuid) returns boolean as $$
  select public.is_admin() or exists (
    select 1 from public.clubs c
    join public.role_assignments ra on ra.organizer_id = c.created_by_organizer_id
    where c.id = target_club_id and ra.user_id = auth.uid() and ra.role = 'ORGANIZADOR'
  );
$$ language sql stable security definer;

drop policy if exists clubs_update on public.clubs;
create policy clubs_update on public.clubs for update
  using (public.is_club(id) or public.is_organizer_created_club(id))
  with check (public.is_club(id) or public.is_organizer_created_club(id));

drop policy if exists courts_write on public.courts;
create policy courts_write on public.courts for all
  using (public.is_club(club_id) or public.is_organizer_created_club(club_id))
  with check (public.is_club(club_id) or public.is_organizer_created_club(club_id));
