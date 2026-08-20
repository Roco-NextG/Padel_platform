-- ============================================================================
-- Padel Platform — Migración 0003: RLS del esquema mínimo
--
-- Mismo patrón que el esquema anterior (is_admin/is_club_manager con
-- security definer), a menor escala: is_admin(), is_club(club_id),
-- is_organizer(organizer_id).
-- ============================================================================

create or replace function public.is_admin() returns boolean as $$
  select exists (
    select 1 from public.role_assignments
    where user_id = auth.uid() and role = 'ADMIN'
  );
$$ language sql stable security definer;

create or replace function public.is_club(target_club_id uuid) returns boolean as $$
  select public.is_admin() or exists (
    select 1 from public.role_assignments
    where user_id = auth.uid() and role = 'CLUB' and club_id = target_club_id
  );
$$ language sql stable security definer;

create or replace function public.is_organizer(target_organizer_id uuid) returns boolean as $$
  select public.is_admin() or exists (
    select 1 from public.role_assignments
    where user_id = auth.uid() and role = 'ORGANIZADOR' and organizer_id = target_organizer_id
  );
$$ language sql stable security definer;

-- ---------------------------------------------------------------------------
-- clubs / organizers
-- ---------------------------------------------------------------------------
-- Nota: a diferencia del esquema anterior, clubs_select NO es pública
-- (using (true)) — no hay página de discovery en esta fase, así que el
-- default es el más restrictivo posible hasta que exista una superficie
-- pública otra vez.
alter table public.clubs enable row level security;

create policy clubs_select on public.clubs for select
  using (public.is_club(id));

create policy clubs_insert on public.clubs for insert
  with check (public.is_admin());

create policy clubs_update on public.clubs for update
  using (public.is_club(id)) with check (public.is_club(id));

-- Sin policy de delete: desactivar via is_active, nunca borrar la fila.

alter table public.organizers enable row level security;

create policy organizers_select on public.organizers for select
  using (public.is_organizer(id));

create policy organizers_insert on public.organizers for insert
  with check (public.is_admin());

create policy organizers_update on public.organizers for update
  using (public.is_organizer(id)) with check (public.is_organizer(id));

-- ---------------------------------------------------------------------------
-- role_assignments
-- ---------------------------------------------------------------------------
alter table public.role_assignments enable row level security;

create policy role_assignments_select on public.role_assignments for select
  using (user_id = auth.uid() or public.is_admin());

create policy role_assignments_write on public.role_assignments for all
  using (public.is_admin()) with check (public.is_admin());
-- redeem_invite() (0004) es security definer, así que salta esta policy —
-- es el ÚNICO camino por el que alguien no-admin termina con una fila
-- propia acá.

-- ---------------------------------------------------------------------------
-- pending_invites / players — solo admin por ahora, mismo patrón que
-- rating_events en el esquema anterior ("hay que pasar por la RPC").
-- ---------------------------------------------------------------------------
alter table public.pending_invites enable row level security;

create policy pending_invites_admin_only on public.pending_invites for all
  using (public.is_admin()) with check (public.is_admin());

alter table public.players enable row level security;

create policy players_admin_only on public.players for all
  using (public.is_admin()) with check (public.is_admin());
