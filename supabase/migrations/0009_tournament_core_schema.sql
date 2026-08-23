-- ============================================================================
-- Padel Platform — Migración 0009: torneos, categorías, equipos, rosters
--
-- Ownership de tournaments (ver plan): club_id NOT NULL siempre (todo
-- torneo pasa por las pistas físicas de un club real, elegido por el propio
-- Club para sus torneos, o por el Organizador como sede al crear el suyo);
-- organizer_id nullable — null significa "el club lo organiza él mismo",
-- no-null significa "un Organizador independiente lo corre en ese club".
-- La gestión queda siempre exclusiva de quien lo creó — el club anfitrión
-- de un torneo ajeno no lo co-administra, solo expone su roster (ver
-- roster_memberships más abajo y su RLS en 0010).
-- ============================================================================

create type public.tournament_status as enum
  ('DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED', 'ARCHIVED');
create type public.phase_type as enum
  ('GROUPS', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTERFINAL', 'SEMIFINAL', 'FINAL', 'CONSOLATION');
create type public.match_type as enum ('TOURNAMENT', 'COMPETITIVE', 'CASUAL');

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  logo_url text,
  cover_image_url text,
  club_id uuid not null references public.clubs(id) on delete restrict,
  organizer_id uuid references public.organizers(id) on delete restrict,
  status public.tournament_status not null default 'DRAFT',
  is_published boolean not null default false,
  start_date date,
  end_date date,
  scoring_config jsonb not null default '{}'::jsonb,
  tiebreak_rules jsonb not null default
    '["matches_won","games_won","set_diff","game_diff","head_to_head"]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tournaments_set_updated_at before update on public.tournaments
  for each row execute function public.set_updated_at();

create table public.tournament_categories (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  level text,
  gender_restriction public.gender_type,
  max_teams int,
  uses_group_stage boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tournament_categories_set_updated_at before update on public.tournament_categories
  for each row execute function public.set_updated_at();

create table public.tournament_groups (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.tournament_categories(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tournament_groups_set_updated_at before update on public.tournament_groups
  for each row execute function public.set_updated_at();

create table public.tournament_phases (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.tournament_categories(id) on delete cascade,
  type public.phase_type not null,
  order_index int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tournament_phases_set_updated_at before update on public.tournament_phases
  for each row execute function public.set_updated_at();

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_category_id uuid references public.tournament_categories(id) on delete cascade,
  group_id uuid references public.tournament_groups(id) on delete set null,
  seed int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger teams_set_updated_at before update on public.teams
  for each row execute function public.set_updated_at();

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_id, player_id)
  -- "un Team tiene exactamente 2 miembros" se valida en la RPC de
  -- inscripción, no como constraint — Postgres no expresa bien "exactamente
  -- N filas por grupo" en un CHECK simple, mismo criterio que el esquema viejo.
);

-- ---------------------------------------------------------------------------
-- roster_memberships — generaliza la vieja club_memberships (club-only,
-- b0362d4:supabase/migrations/0001_schema.sql:114) a Club+Organizador via
-- el patrón XOR ya usado en role_assignments/pending_invites/account_billing.
-- El "role" club_role del esquema viejo (STAFF/OWNER/MANAGER) se cae a
-- propósito: esa distinción ya la resuelve role_assignments, no hace falta
-- duplicarla acá — esto es solo "¿este jugador está en mi roster?".
-- ---------------------------------------------------------------------------
create table public.roster_memberships (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete cascade,
  organizer_id uuid references public.organizers(id) on delete cascade,
  joined_at timestamptz not null default now(),
  constraint roster_memberships_scope_check check (
    (club_id is not null and organizer_id is null) or (club_id is null and organizer_id is not null)
  )
);
-- NULLS NOT DISTINCT — mismo motivo que role_assignments_scope_unique
-- (0002_schema.sql): un UNIQUE normal deja que dos filas con el mismo
-- player_id/organizer_id (club_id en NULL en ambas, siempre) se dupliquen
-- sin avisar, porque SQL estándar trata NULL como "no igual a sí mismo".
create unique index roster_memberships_scope_unique
  on public.roster_memberships (player_id, club_id, organizer_id)
  nulls not distinct;

grant all on public.tournaments, public.tournament_categories, public.tournament_groups,
  public.tournament_phases, public.teams, public.team_members, public.roster_memberships to service_role;
grant select, insert, update, delete on public.tournaments, public.tournament_categories, public.tournament_groups,
  public.tournament_phases, public.teams, public.team_members, public.roster_memberships to authenticated;
grant select on public.tournaments, public.tournament_categories, public.tournament_groups,
  public.tournament_phases, public.teams, public.team_members, public.roster_memberships to anon;
