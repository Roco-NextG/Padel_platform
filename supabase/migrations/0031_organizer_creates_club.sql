-- ============================================================================
-- Padel Platform — Migración 0031: el Organizador puede ver clubes (bug de
-- RLS) y crear un club nuevo con sus pistas cuando no tiene ninguno para
-- elegir como sede de su torneo.
--
-- Bug encontrado en vivo: fetchClubHostOptions() (courtRepository.ts) lee
-- `clubs` con el cliente scoped al usuario — bajo RLS real, no service_role.
-- clubs_select (0003_rls.sql) usa is_club(id), que SOLO es true para la
-- cuenta CLUB dueña de ESE club puntual — un Organizador nunca lo cumple,
-- para ningún club. courts_select ya se había corregido en 0007 para usar
-- is_tournament_staff() (CLUB u ORGANIZADOR), pero el comentario de esa
-- migración decía (incorrectamente) que clubs ya tenía el mismo criterio.
-- Resultado: el picker de "¿en qué club se juega?" del Organizador siempre
-- mostraba "no hay ningún club" sin importar cuántos clubes reales existan.
--
-- Segundo cambio (pedido explícito, fase 1 — más adelante se restringe a
-- "una sola sede propia por organizador"): un Organizador puede crear un
-- club nuevo con N pistas directamente desde el wizard de creación de
-- torneo, para no quedar bloqueado si todavía no hay ningún club cargado.
-- clubs_insert sigue exigiendo is_admin() a nivel de RLS (no se toca) — la
-- creación pasa por una RPC security definer que valida el rol adentro,
-- mismo patrón ya usado en el resto del schema (redeem_invite, etc.).
-- Se guarda qué organizador lo creó (created_by_organizer_id) para que más
-- adelante un admin pueda "reclamar" ese club y vincularlo a una cuenta
-- Club real cuando se suscriba de verdad — fetchAllPlatformUsers() ya
-- recorre `clubs` directamente (no role_assignments), así que este club
-- aparece automáticamente en /admin/usuarios como "sin dueño" apenas se crea,
-- sin necesidad de ningún cambio ahí.
-- ============================================================================

drop policy if exists clubs_select on public.clubs;
create policy clubs_select on public.clubs for select
  using (public.is_club(id) or (public.is_tournament_staff() and is_active));

alter table public.clubs
  add column if not exists created_by_organizer_id uuid references public.organizers(id) on delete set null;

create or replace function public.create_club_as_organizer(p_name text, p_city text, p_court_count int)
returns uuid
language plpgsql
security definer
as $$
declare
  v_organizer public.organizers;
  v_club_id uuid;
  i int;
begin
  select o.* into v_organizer
  from public.role_assignments ra
  join public.organizers o on o.id = ra.organizer_id
  where ra.user_id = auth.uid() and ra.role = 'ORGANIZADOR'
  limit 1;

  if v_organizer.id is null and not public.is_admin() then
    raise exception 'create_club_as_organizer: solo una cuenta Organizador puede crear un club nuevo';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'create_club_as_organizer: el nombre del club es obligatorio';
  end if;
  if p_court_count is null or p_court_count < 1 or p_court_count > 20 then
    raise exception 'create_club_as_organizer: la cantidad de pistas debe ser entre 1 y 20';
  end if;

  insert into public.clubs (name, city, contact_email, contact_first_name, contact_last_name, contact_phone, created_by_organizer_id)
  values (
    trim(p_name),
    nullif(trim(coalesce(p_city, '')), ''),
    v_organizer.contact_email,
    v_organizer.contact_first_name,
    v_organizer.contact_last_name,
    v_organizer.contact_phone,
    v_organizer.id
  )
  returning id into v_club_id;

  for i in 1..p_court_count loop
    insert into public.courts (club_id, name, status) values (v_club_id, 'Pista ' || i, 'AVAILABLE');
  end loop;

  return v_club_id;
end;
$$;

grant execute on function public.create_club_as_organizer(text, text, int) to authenticated;
