-- ============================================================================
-- Padel Platform — Migración 0010: RLS de torneos + rosters + players
-- ============================================================================

create or replace function public.is_tournament_manager(target_tournament_id uuid) returns boolean as $$
  select public.is_admin() or exists (
    select 1 from public.tournaments t
    where t.id = target_tournament_id
      and (
        (t.organizer_id is null and public.is_club(t.club_id))
        or (t.organizer_id is not null and public.is_organizer(t.organizer_id))
      )
  );
$$ language sql stable security definer;

-- Ported verbatim from the old schema (b0362d4:0002_rls.sql) — pure joins,
-- zero coupling to the old role model.
create or replace function public.owns_player(target_player_id uuid) returns boolean as $$
  select public.is_admin() or exists (
    select 1 from public.players where id = target_player_id and user_id = auth.uid()
  );
$$ language sql stable security definer;

-- is_match_participant() is NOT defined here — it references public.matches,
-- which doesn't exist until 0011. Defined in 0012 (matches RLS), right
-- before it's actually needed, to avoid a forward reference.

alter table public.tournaments enable row level security;

create policy tournaments_select on public.tournaments for select
  using (is_published = true or public.is_tournament_manager(id));

create policy tournaments_insert on public.tournaments for insert
  with check (
    public.is_admin()
    or (organizer_id is null and public.is_club(club_id))
    or (organizer_id is not null and public.is_organizer(organizer_id))
  );

create policy tournaments_update on public.tournaments for update
  using (public.is_tournament_manager(id)) with check (public.is_tournament_manager(id));

alter table public.tournament_categories enable row level security;

create policy tournament_categories_select on public.tournament_categories for select
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and (t.is_published or public.is_tournament_manager(t.id))
    )
  );
create policy tournament_categories_write on public.tournament_categories for all
  using (public.is_tournament_manager(tournament_id)) with check (public.is_tournament_manager(tournament_id));

alter table public.tournament_groups enable row level security;

create policy tournament_groups_select on public.tournament_groups for select
  using (
    exists (
      select 1 from public.tournament_categories c join public.tournaments t on t.id = c.tournament_id
      where c.id = category_id and (t.is_published or public.is_tournament_manager(t.id))
    )
  );
create policy tournament_groups_write on public.tournament_groups for all
  using (exists (select 1 from public.tournament_categories c where c.id = category_id and public.is_tournament_manager(c.tournament_id)))
  with check (exists (select 1 from public.tournament_categories c where c.id = category_id and public.is_tournament_manager(c.tournament_id)));

alter table public.tournament_phases enable row level security;

create policy tournament_phases_select on public.tournament_phases for select
  using (
    exists (
      select 1 from public.tournament_categories c join public.tournaments t on t.id = c.tournament_id
      where c.id = category_id and (t.is_published or public.is_tournament_manager(t.id))
    )
  );
create policy tournament_phases_write on public.tournament_phases for all
  using (exists (select 1 from public.tournament_categories c where c.id = category_id and public.is_tournament_manager(c.tournament_id)))
  with check (exists (select 1 from public.tournament_categories c where c.id = category_id and public.is_tournament_manager(c.tournament_id)));

alter table public.teams enable row level security;

create policy teams_select on public.teams for select
  using (
    tournament_category_id is null
    or exists (
      select 1 from public.tournament_categories c join public.tournaments t on t.id = c.tournament_id
      where c.id = tournament_category_id and (t.is_published or public.is_tournament_manager(t.id))
    )
  );
create policy teams_write on public.teams for all
  using (
    tournament_category_id is not null
    and exists (select 1 from public.tournament_categories c where c.id = tournament_category_id and public.is_tournament_manager(c.tournament_id))
  )
  with check (
    tournament_category_id is not null
    and exists (select 1 from public.tournament_categories c where c.id = tournament_category_id and public.is_tournament_manager(c.tournament_id))
  );

alter table public.team_members enable row level security;

-- Más estricto que el esquema viejo (using(true), lectura pública total) —
-- hereda la visibilidad del torneo en vez de exponer parejas globalmente,
-- mismo criterio "sin superficie pública de más" ya aplicado en esta fase.
create policy team_members_select on public.team_members for select
  using (
    exists (
      select 1 from public.teams tm join public.tournament_categories c on c.id = tm.tournament_category_id
      join public.tournaments t on t.id = c.tournament_id
      where tm.id = team_id and (t.is_published or public.is_tournament_manager(t.id))
    )
  );
create policy team_members_write on public.team_members for all
  using (exists (select 1 from public.teams tm join public.tournament_categories c on c.id = tm.tournament_category_id where tm.id = team_id and public.is_tournament_manager(c.tournament_id)))
  with check (exists (select 1 from public.teams tm join public.tournament_categories c on c.id = tm.tournament_category_id where tm.id = team_id and public.is_tournament_manager(c.tournament_id)));

-- ---------------------------------------------------------------------------
-- roster_memberships — implementa la regla exacta pedida: un Club ve solo
-- su propio roster; un Organizador ve el suyo MÁS el de cualquier club
-- donde administre un torneo en este momento.
-- ---------------------------------------------------------------------------
alter table public.roster_memberships enable row level security;

create policy roster_memberships_select on public.roster_memberships for select
  using (
    public.is_admin()
    or public.is_club(club_id)
    or public.is_organizer(organizer_id)
    or (
      club_id is not null and exists (
        select 1 from public.tournaments t
        where t.club_id = roster_memberships.club_id
          and t.organizer_id is not null
          and public.is_organizer(t.organizer_id)
      )
    )
  );

create policy roster_memberships_write on public.roster_memberships for all
  using (public.is_admin() or public.is_club(club_id) or public.is_organizer(organizer_id))
  with check (public.is_admin() or public.is_club(club_id) or public.is_organizer(organizer_id));

-- ---------------------------------------------------------------------------
-- players — reemplaza el players_admin_only de 0003_rls.sql (correcto
-- mientras no había ningún concepto de roster todavía) por lectura propia +
-- admin + visible a través de roster_memberships con exactamente la misma
-- regla de arriba.
-- ---------------------------------------------------------------------------
drop policy if exists players_admin_only on public.players;

create policy players_select on public.players for select
  using (
    public.is_admin()
    or user_id = auth.uid()
    or exists (
      select 1 from public.roster_memberships rm
      where rm.player_id = players.id
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

create policy players_write on public.players for all
  using (public.is_admin() or user_id = auth.uid())
  with check (public.is_admin() or user_id = auth.uid());
-- Los jugadores "importados" (user_id null, creados vía
-- create_player_for_enrollment) se escriben solo a través de esa RPC
-- security definer, que bypassea RLS — igual que el resto de este esquema.
