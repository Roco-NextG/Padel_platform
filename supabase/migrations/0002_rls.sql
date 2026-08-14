-- ============================================================================
-- Padel Platform — Migración 0002: RBAC (helpers) + Row Level Security
--
-- Principio: como Supabase expone la base directamente vía su API, la
-- seguridad tiene que vivir en la base (RLS), no solo en el backend Next.js
-- (docs/09_TECHNICAL_ARCHITECTURE.md, decisión de Auth).
--
-- Los flujos con lógica de negocio compleja (registrar resultado de partido,
-- actualizar rating) NO se exponen como UPDATE/INSERT directo sobre las
-- tablas — se hacen a través de funciones RPC `security definer` (ver
-- función `submit_match_result` al final de este archivo como ejemplo del
-- patrón). Esto mantiene las políticas RLS simples y la lógica de validación
-- centralizada en un solo lugar, en vez de duplicada entre RLS y aplicación.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Funciones helper de RBAC
-- ---------------------------------------------------------------------------
create or replace function public.has_role(check_role app_role)
returns boolean as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = check_role
  );
$$ language sql stable security definer;

create or replace function public.is_admin()
returns boolean as $$
  select public.has_role('SUPER_ADMIN') or public.has_role('ADMIN');
$$ language sql stable security definer;

create or replace function public.is_club_manager(target_club_id uuid)
returns boolean as $$
  select public.is_admin() or exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and club_id = target_club_id
      and role in ('CLUB_OWNER', 'CLUB_MANAGER')
  );
$$ language sql stable security definer;

create or replace function public.is_tournament_manager(target_tournament_id uuid)
returns boolean as $$
  select public.is_admin()
    or exists (
      select 1
      from public.tournaments t
      join public.organizers o on o.id = t.organizer_id
      where t.id = target_tournament_id and o.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.tournaments t
      where t.id = target_tournament_id
        and public.is_club_manager(t.club_id)
    );
$$ language sql stable security definer;

create or replace function public.owns_player(target_player_id uuid)
returns boolean as $$
  select public.is_admin() or exists (
    select 1 from public.players
    where id = target_player_id and user_id = auth.uid()
  );
$$ language sql stable security definer;

create or replace function public.is_match_participant(target_match_id uuid)
returns boolean as $$
  select exists (
    select 1
    from public.matches m
    join public.team_members tm on tm.team_id in (m.team_a_id, m.team_b_id)
    join public.players p on p.id = tm.player_id
    where m.id = target_match_id and p.user_id = auth.uid()
  );
$$ language sql stable security definer;

-- ---------------------------------------------------------------------------
-- RLS: players
-- ---------------------------------------------------------------------------
alter table public.players enable row level security;

create policy players_select on public.players for select
  using (public_profile = true or user_id = auth.uid() or public.is_admin());

create policy players_insert on public.players for insert
  with check (user_id = auth.uid() or public.is_admin());

create policy players_update on public.players for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- RLS: clubs (públicos de lectura: nombre y branding son de cara al público)
-- ---------------------------------------------------------------------------
alter table public.clubs enable row level security;

create policy clubs_select on public.clubs for select using (true);

create policy clubs_insert on public.clubs for insert
  with check (public.has_role('CLUB_OWNER') or public.is_admin());

create policy clubs_update on public.clubs for update
  using (public.is_club_manager(id)) with check (public.is_club_manager(id));

-- ---------------------------------------------------------------------------
-- RLS: courts
-- ---------------------------------------------------------------------------
alter table public.courts enable row level security;

create policy courts_select on public.courts for select using (true);

create policy courts_write on public.courts for all
  using (public.is_club_manager(club_id)) with check (public.is_club_manager(club_id));

-- ---------------------------------------------------------------------------
-- RLS: organizers
-- ---------------------------------------------------------------------------
alter table public.organizers enable row level security;

create policy organizers_select on public.organizers for select using (true);

create policy organizers_insert on public.organizers for insert
  with check (user_id = auth.uid() or public.is_admin());

create policy organizers_update on public.organizers for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- RLS: club_memberships
-- ---------------------------------------------------------------------------
alter table public.club_memberships enable row level security;

create policy club_memberships_select on public.club_memberships for select
  using (
    public.owns_player(player_id)
    or public.is_club_manager(club_id)
  );

create policy club_memberships_write on public.club_memberships for all
  using (public.is_club_manager(club_id)) with check (public.is_club_manager(club_id));

-- ---------------------------------------------------------------------------
-- RLS: user_roles (solo admin gestiona roles; cada usuario ve los suyos)
-- ---------------------------------------------------------------------------
alter table public.user_roles enable row level security;

create policy user_roles_select on public.user_roles for select
  using (user_id = auth.uid() or public.is_admin());

create policy user_roles_write on public.user_roles for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- RLS: tournaments
-- ---------------------------------------------------------------------------
alter table public.tournaments enable row level security;

create policy tournaments_select on public.tournaments for select
  using (is_published = true or public.is_tournament_manager(id));

create policy tournaments_insert on public.tournaments for insert
  with check (
    exists (
      select 1 from public.organizers o
      where o.id = organizer_id and o.user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy tournaments_update on public.tournaments for update
  using (public.is_tournament_manager(id)) with check (public.is_tournament_manager(id));

-- ---------------------------------------------------------------------------
-- RLS: tournament_categories / groups / phases (heredan visibilidad del torneo)
-- ---------------------------------------------------------------------------
alter table public.tournament_categories enable row level security;

create policy tournament_categories_select on public.tournament_categories for select
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and (t.is_published or public.is_tournament_manager(t.id))
    )
  );

create policy tournament_categories_write on public.tournament_categories for all
  using (public.is_tournament_manager(tournament_id))
  with check (public.is_tournament_manager(tournament_id));

alter table public.tournament_groups enable row level security;

create policy tournament_groups_select on public.tournament_groups for select
  using (
    exists (
      select 1 from public.tournament_categories c
      join public.tournaments t on t.id = c.tournament_id
      where c.id = category_id and (t.is_published or public.is_tournament_manager(t.id))
    )
  );

create policy tournament_groups_write on public.tournament_groups for all
  using (
    exists (
      select 1 from public.tournament_categories c
      where c.id = category_id and public.is_tournament_manager(c.tournament_id)
    )
  )
  with check (
    exists (
      select 1 from public.tournament_categories c
      where c.id = category_id and public.is_tournament_manager(c.tournament_id)
    )
  );

alter table public.tournament_phases enable row level security;

create policy tournament_phases_select on public.tournament_phases for select
  using (
    exists (
      select 1 from public.tournament_categories c
      join public.tournaments t on t.id = c.tournament_id
      where c.id = category_id and (t.is_published or public.is_tournament_manager(t.id))
    )
  );

create policy tournament_phases_write on public.tournament_phases for all
  using (
    exists (
      select 1 from public.tournament_categories c
      where c.id = category_id and public.is_tournament_manager(c.tournament_id)
    )
  )
  with check (
    exists (
      select 1 from public.tournament_categories c
      where c.id = category_id and public.is_tournament_manager(c.tournament_id)
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: teams / team_members
-- ---------------------------------------------------------------------------
alter table public.teams enable row level security;

create policy teams_select on public.teams for select
  using (
    tournament_category_id is null
    or exists (
      select 1 from public.tournament_categories c
      join public.tournaments t on t.id = c.tournament_id
      where c.id = tournament_category_id and (t.is_published or public.is_tournament_manager(t.id))
    )
  );

create policy teams_write on public.teams for all
  using (
    tournament_category_id is not null
    and exists (
      select 1 from public.tournament_categories c
      where c.id = tournament_category_id and public.is_tournament_manager(c.tournament_id)
    )
  )
  with check (
    tournament_category_id is not null
    and exists (
      select 1 from public.tournament_categories c
      where c.id = tournament_category_id and public.is_tournament_manager(c.tournament_id)
    )
  );

alter table public.team_members enable row level security;

create policy team_members_select on public.team_members for select using (true);

create policy team_members_write on public.team_members for all
  using (
    exists (
      select 1 from public.teams tm
      join public.tournament_categories c on c.id = tm.tournament_category_id
      where tm.id = team_id and public.is_tournament_manager(c.tournament_id)
    )
  )
  with check (
    exists (
      select 1 from public.teams tm
      join public.tournament_categories c on c.id = tm.tournament_category_id
      where tm.id = team_id and public.is_tournament_manager(c.tournament_id)
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: matches / set_scores
-- Lectura pública si el torneo está publicado; escritura restringida al
-- organizador/staff del torneo. El registro de resultado iniciado por un
-- jugador pasa por la función RPC `submit_match_result` (ver más abajo),
-- no por UPDATE directo.
-- ---------------------------------------------------------------------------
alter table public.matches enable row level security;

create policy matches_select on public.matches for select
  using (
    tournament_id is null
    or exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and (t.is_published or public.is_tournament_manager(t.id))
    )
  );

create policy matches_write on public.matches for all
  using (tournament_id is not null and public.is_tournament_manager(tournament_id))
  with check (tournament_id is not null and public.is_tournament_manager(tournament_id));

alter table public.set_scores enable row level security;

create policy set_scores_select on public.set_scores for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (
        m.tournament_id is null
        or exists (
          select 1 from public.tournaments t
          where t.id = m.tournament_id and (t.is_published or public.is_tournament_manager(t.id))
        )
      )
    )
  );

create policy set_scores_write on public.set_scores for all
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and m.tournament_id is not null
        and public.is_tournament_manager(m.tournament_id)
    )
  )
  with check (
    exists (
      select 1 from public.matches m
      where m.id = match_id and m.tournament_id is not null
        and public.is_tournament_manager(m.tournament_id)
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: match_confirmations (cada jugador gestiona su propia confirmación)
-- ---------------------------------------------------------------------------
alter table public.match_confirmations enable row level security;

create policy match_confirmations_select on public.match_confirmations for select
  using (
    public.owns_player(player_id)
    or public.is_match_participant(match_id)
    or exists (
      select 1 from public.matches m
      where m.id = match_id and m.tournament_id is not null
        and public.is_tournament_manager(m.tournament_id)
    )
  );

create policy match_confirmations_write on public.match_confirmations for all
  using (public.owns_player(player_id))
  with check (public.owns_player(player_id));

-- ---------------------------------------------------------------------------
-- RLS: rating_events / rating_history
-- Solo lectura para jugadores (de su propio historial o de perfiles públicos);
-- la escritura SIEMPRE pasa por RPC con `security definer` (nunca INSERT
-- directo desde el cliente) — es la regla dura "rating nunca se modifica
-- directamente" aplicada también a nivel de base de datos.
-- ---------------------------------------------------------------------------
alter table public.rating_events enable row level security;

create policy rating_events_select on public.rating_events for select
  using (
    public.owns_player(player_id)
    or public.is_admin()
    or exists (select 1 from public.players p where p.id = player_id and p.public_profile = true)
  );
-- Sin policy de insert/update/delete para el rol `authenticated`: solo se
-- escribe vía función `security definer` ejecutada con privilegios elevados.

-- ---------------------------------------------------------------------------
-- RLS: audit_log (solo admin)
-- ---------------------------------------------------------------------------
alter table public.audit_log enable row level security;

create policy audit_log_select on public.audit_log for select using (public.is_admin());
-- Sin policy de insert para clientes: el audit log se escribe desde triggers
-- o funciones `security definer`, nunca desde el cliente directamente.

-- ============================================================================
-- Patrón de RPC para lógica de negocio (ejemplo — se completa en Fase 6,
-- Match Engine). Se deja aquí el esqueleto para que Claude Code lo desarrolle
-- junto con las reglas de validación de docs/06_MATCH_ENGINE.md.
-- ============================================================================
create or replace function public.submit_match_result(
  p_match_id uuid,
  p_sets jsonb -- [{ "set_number": 1, "team_a_games": 6, "team_b_games": 4, ... }, ...]
)
returns void as $$
begin
  -- TODO (Fase 6 — Match Engine):
  --   1. Verificar que auth.uid() pertenece a un jugador de team_a o team_b
  --      de este match (public.is_match_participant) o es el organizador.
  --   2. Validar el formato contra tournaments.scoring_config
  --      (docs/06_MATCH_ENGINE.md §2) — reglas de sets/tiebreak/super-tiebreak.
  --   3. Insertar set_scores, determinar winner_team_id.
  --   4. Si lo registra el organizador: status = CONFIRMED directo.
  --      Si lo registra un jugador: status = PENDING_CONFIRMATION y crear
  --      match_confirmations para los otros 3 jugadores.
  --   5. Insertar fila en audit_log.
  raise exception 'submit_match_result: pendiente de implementar en Fase 6 (Match Engine)';
end;
$$ language plpgsql security definer;
