-- ============================================================================
-- Padel Platform — Migración 0009: reparación idempotente de RLS
-- (tournaments en adelante)
--
-- Encontrado al armar datos de prueba reales para validar 0008: un INSERT en
-- `tournaments` con un `organizer_id` que sí pertenece al caller (verificado
-- por separado con una consulta directa) fue rechazado con "new row violates
-- row level security policy" — el mismo mensaje que da Postgres tanto si una
-- policy existe y evalúa false como si NO EXISTE NINGUNA policy para ese
-- comando. La policy `tournaments_insert` de 0002_rls.sql es, letra por
-- letra, correcta (se verificó de nuevo contra Postgres real en Docker,
-- pasa). Una tabla ANTERIOR en el mismo archivo (`courts`) sí funciona
-- correctamente contra el proyecto real con el mismo usuario.
--
-- Conclusión: lo que quedó aplicado en el proyecto real no es exactamente
-- 0002_rls.sql completo — probablemente el pegado en el SQL Editor se cortó
-- o falló a partir de la sección "RLS: tournaments" en adelante (el SQL
-- Editor detiene la ejecución en el primer error de un bloque pegado). No es
-- un bug del archivo; es una discrepancia entre el archivo y lo que
-- realmente corrió.
--
-- Esta migración reafirma, de forma IDEMPOTENTE (`drop policy if exists` +
-- `create policy`), todas las policies desde `tournaments` hasta
-- `audit_log` — el resto de 0002_rls.sql (players a user_roles) no se toca
-- porque ya se confirmó que funciona. El contenido de cada policy es
-- idéntico al de 0002_rls.sql, sin cambios de lógica, con UNA excepción
-- (ver nota siguiente). Segura de correr más de una vez.
--
-- SEGUNDO GAP, encontrado al armar un torneo real para probar 0008: un
-- `INSERT ... RETURNING` directo en `tournaments` (lo que hace PostgREST/
-- supabase-js en cualquier insert sin pasar por RPC) fallaba con "violates
-- row-level security policy" incluso con el organizador correcto — pero un
-- INSERT idéntico SIN `RETURNING` funcionaba perfecto, y un SELECT aparte
-- inmediatamente después también. Aislado a: `tournaments_select` usa
-- `is_tournament_manager(id)`, una función `security definer` que hace un
-- self-join contra `tournaments` — al evaluarse como parte del RETURNING de
-- un INSERT en esa MISMA tabla, esa subconsulta interna no ve la fila que
-- el propio comando acaba de insertar (una particularidad real de Postgres
-- con funciones `security definer` autorreferenciales dentro de RLS,
-- verificada aislando el caso: la misma lógica puesta en línea, sin pasar
-- por la función, sí funciona). No afecta ningún flujo ya construido (no
-- hay UI de torneos conectada todavía), pero sí habría bloqueado la
-- creación directa de torneos el día que exista. `tournaments_select` se
-- reescribe aquí con el chequeo de organizador/club en línea en vez de vía
-- `is_tournament_manager(id)`; `is_tournament_manager()` en sí NO se toca
-- (se usa en más de diez policies) porque solo este caso — la tabla
-- consultándose a sí misma en el mismo comando — dispara el problema.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- RLS: tournaments
-- ---------------------------------------------------------------------------
alter table public.tournaments enable row level security;

-- Chequeo de organizador/club en línea, no vía is_tournament_manager(id) —
-- ver nota grande de arriba (self-referencia + INSERT...RETURNING).
drop policy if exists tournaments_select on public.tournaments;
create policy tournaments_select on public.tournaments for select
  using (
    is_published = true
    or public.is_admin()
    or exists (
      select 1 from public.organizers o
      where o.id = tournaments.organizer_id and o.user_id = auth.uid()
    )
    or public.is_club_manager(tournaments.club_id)
  );

drop policy if exists tournaments_insert on public.tournaments;
create policy tournaments_insert on public.tournaments for insert
  with check (
    exists (
      select 1 from public.organizers o
      where o.id = organizer_id and o.user_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists tournaments_update on public.tournaments;
create policy tournaments_update on public.tournaments for update
  using (public.is_tournament_manager(id)) with check (public.is_tournament_manager(id));

-- ---------------------------------------------------------------------------
-- RLS: tournament_categories / groups / phases (heredan visibilidad del torneo)
-- ---------------------------------------------------------------------------
alter table public.tournament_categories enable row level security;

drop policy if exists tournament_categories_select on public.tournament_categories;
create policy tournament_categories_select on public.tournament_categories for select
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and (t.is_published or public.is_tournament_manager(t.id))
    )
  );

drop policy if exists tournament_categories_write on public.tournament_categories;
create policy tournament_categories_write on public.tournament_categories for all
  using (public.is_tournament_manager(tournament_id))
  with check (public.is_tournament_manager(tournament_id));

alter table public.tournament_groups enable row level security;

drop policy if exists tournament_groups_select on public.tournament_groups;
create policy tournament_groups_select on public.tournament_groups for select
  using (
    exists (
      select 1 from public.tournament_categories c
      join public.tournaments t on t.id = c.tournament_id
      where c.id = category_id and (t.is_published or public.is_tournament_manager(t.id))
    )
  );

drop policy if exists tournament_groups_write on public.tournament_groups;
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

drop policy if exists tournament_phases_select on public.tournament_phases;
create policy tournament_phases_select on public.tournament_phases for select
  using (
    exists (
      select 1 from public.tournament_categories c
      join public.tournaments t on t.id = c.tournament_id
      where c.id = category_id and (t.is_published or public.is_tournament_manager(t.id))
    )
  );

drop policy if exists tournament_phases_write on public.tournament_phases;
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

drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select
  using (
    tournament_category_id is null
    or exists (
      select 1 from public.tournament_categories c
      join public.tournaments t on t.id = c.tournament_id
      where c.id = tournament_category_id and (t.is_published or public.is_tournament_manager(t.id))
    )
  );

drop policy if exists teams_write on public.teams;
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

drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members for select using (true);

drop policy if exists team_members_write on public.team_members;
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
-- ---------------------------------------------------------------------------
alter table public.matches enable row level security;

drop policy if exists matches_select on public.matches;
create policy matches_select on public.matches for select
  using (
    tournament_id is null
    or exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and (t.is_published or public.is_tournament_manager(t.id))
    )
  );

drop policy if exists matches_write on public.matches;
create policy matches_write on public.matches for all
  using (tournament_id is not null and public.is_tournament_manager(tournament_id))
  with check (tournament_id is not null and public.is_tournament_manager(tournament_id));

alter table public.set_scores enable row level security;

drop policy if exists set_scores_select on public.set_scores;
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

drop policy if exists set_scores_write on public.set_scores;
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

drop policy if exists match_confirmations_select on public.match_confirmations;
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

drop policy if exists match_confirmations_write on public.match_confirmations;
create policy match_confirmations_write on public.match_confirmations for all
  using (public.owns_player(player_id))
  with check (public.owns_player(player_id));

-- ---------------------------------------------------------------------------
-- RLS: rating_events / rating_history
-- ---------------------------------------------------------------------------
alter table public.rating_events enable row level security;

drop policy if exists rating_events_select on public.rating_events;
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

drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log for select using (public.is_admin());
-- Sin policy de insert para clientes: el audit log se escribe desde triggers
-- o funciones `security definer`, nunca desde el cliente directamente.
