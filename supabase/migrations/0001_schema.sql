-- ============================================================================
-- Padel Platform — Migración 0001: schema inicial
-- Basado en docs/03_DATABASE_SCHEMA.md
--
-- DECISIÓN DE ADAPTACIÓN A SUPABASE:
-- No se crea una tabla `public.users` propia. Supabase ya gestiona
-- `auth.users` (email, password, phone, estado de la cuenta). `Player.user_id`
-- referencia directo a `auth.users(id)`. Suspensión/eliminación de cuenta se
-- maneja con las herramientas nativas de Supabase Auth (ban/soft-delete), no
-- con una columna `status` propia — simplificación deliberada para MVP.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type gender_type as enum ('MALE', 'FEMALE', 'OTHER');
create type hand_type as enum ('RIGHT', 'LEFT');
create type position_type as enum ('DRIVE', 'REVES', 'BOTH');
create type club_role as enum ('MEMBER', 'STAFF', 'OWNER', 'MANAGER');
create type organizer_type as enum ('INDIVIDUAL', 'COMPANY');
create type court_status as enum ('AVAILABLE', 'MAINTENANCE', 'DISABLED');
create type tournament_status as enum (
  'DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED',
  'IN_PROGRESS', 'FINISHED', 'CANCELLED', 'ARCHIVED'
);
create type phase_type as enum (
  'GROUPS', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTERFINAL',
  'SEMIFINAL', 'FINAL', 'CONSOLATION'
);
create type match_status as enum (
  'SCHEDULED', 'IN_PROGRESS', 'PENDING_CONFIRMATION', 'CONFIRMED',
  'DISPUTED', 'CANCELLED'
);
create type match_type as enum ('TOURNAMENT', 'COMPETITIVE', 'CASUAL');
create type rating_reason as enum ('TOURNAMENT_MATCH', 'COMPETITIVE_MATCH');
-- Roles RBAC (docs/01_ARCHITECTURE.md §4, brief sección 64)
create type app_role as enum (
  'SUPER_ADMIN', 'ADMIN', 'CLUB_OWNER', 'CLUB_MANAGER',
  'ORGANIZER', 'TOURNAMENT_STAFF', 'PLAYER'
);

-- ---------------------------------------------------------------------------
-- Helper: trigger genérico de updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- 1. Identidad
-- ---------------------------------------------------------------------------
create table public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  photo_url text,
  birth_date date,
  gender gender_type,
  country_id uuid,
  city text,
  hand hand_type,
  preferred_position position_type,
  public_profile boolean not null default true,
  primary_club_id uuid, -- FK diferida, ver más abajo (clubs se crea después)
  -- proyección desnormalizada del último RatingEvent (nunca se escribe a mano, ver docs/05_RATING_ENGINE.md §7)
  current_rating numeric(5,2),
  current_rating_deviation numeric(6,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_id uuid,
  city text,
  address text,
  branding jsonb not null default '{}'::jsonb, -- { logo_url, primary_color, secondary_color, accent, font }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.players
  add constraint players_primary_club_fk
  foreign key (primary_club_id) references public.clubs(id) on delete set null;

create table public.courts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  number int,
  indoor boolean not null default false,
  status court_status not null default 'AVAILABLE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type organizer_type not null default 'INDIVIDUAL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  role club_role not null default 'MEMBER',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, club_id, role)
);

-- RBAC: roles pueden ser globales (club_id/organizer_id null) o acotados a
-- un club u organizador concreto (docs/09_TECHNICAL_ARCHITECTURE.md, Auth).
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  club_id uuid references public.clubs(id) on delete cascade,
  organizer_id uuid references public.organizers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, role, club_id, organizer_id)
);

-- ---------------------------------------------------------------------------
-- 2. Torneos
-- ---------------------------------------------------------------------------
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  logo_url text,
  cover_image_url text,
  organizer_id uuid not null references public.organizers(id) on delete restrict,
  club_id uuid not null references public.clubs(id) on delete restrict,
  status tournament_status not null default 'DRAFT',
  is_published boolean not null default false, -- visibilidad en Discovery, independiente de `status`
  start_date date,
  end_date date,
  scoring_config jsonb not null default '{}'::jsonb,
  tiebreak_rules jsonb not null default
    '["matches_won","games_won","set_diff","game_diff","head_to_head"]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournament_categories (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null, -- ej. "4ta Masculina"
  level text,
  gender_restriction gender_type,
  max_teams int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournament_groups (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.tournament_categories(id) on delete cascade,
  name text not null, -- "Grupo A"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournament_phases (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.tournament_categories(id) on delete cascade,
  type phase_type not null,
  order_index int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Parejas y partidos
-- ---------------------------------------------------------------------------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_category_id uuid references public.tournament_categories(id) on delete cascade,
  group_id uuid references public.tournament_groups(id) on delete set null,
  seed int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_id, player_id)
  -- Nota: "un Team tiene exactamente 2 TeamMember" (docs/03_DATABASE_SCHEMA.md §4)
  -- se valida a nivel de aplicación / RPC, no como constraint de Postgres
  -- (Postgres no expresa bien "exactamente N filas por grupo" como CHECK simple).
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade, -- NULL para CasualMatch (v2)
  phase_id uuid references public.tournament_phases(id) on delete set null,
  group_id uuid references public.tournament_groups(id) on delete set null,
  round_index int,
  court_id uuid references public.courts(id) on delete set null,
  team_a_id uuid references public.teams(id) on delete cascade,
  team_b_id uuid references public.teams(id) on delete cascade,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  status match_status not null default 'SCHEDULED',
  winner_team_id uuid references public.teams(id) on delete set null,
  match_type match_type not null default 'TOURNAMENT', -- CASUAL/COMPETITIVE libres se activan en v2
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  constraint matches_team_a_not_team_b check (team_a_id is distinct from team_b_id)
);

create table public.set_scores (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  set_number int not null,
  team_a_games int not null,
  team_b_games int not null,
  tiebreak_a int,
  tiebreak_b int,
  created_at timestamptz not null default now(),
  unique (match_id, set_number)
);

create table public.match_confirmations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  confirmed boolean not null default false,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);

-- ---------------------------------------------------------------------------
-- 4. Rating
-- ---------------------------------------------------------------------------
create table public.rating_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  partner_id uuid references public.players(id) on delete set null,
  old_rating numeric(5,2) not null,
  new_rating numeric(5,2) not null,
  old_rd numeric(6,2) not null,
  new_rd numeric(6,2) not null,
  reason rating_reason not null,
  algorithm_version text not null,
  superseded boolean not null default false, -- ver docs/05_RATING_ENGINE.md §8, recalculo histórico
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
-- RatingHistory NO es una tabla propia: es una vista sobre rating_events (ver más abajo).

-- ---------------------------------------------------------------------------
-- 5. Auditoría
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. Vistas derivadas
-- ---------------------------------------------------------------------------

-- RatingHistory: proyección ordenada de rating_events por jugador (docs/03_DATABASE_SCHEMA.md §5)
create view public.rating_history as
select *
from public.rating_events
where superseded = false
order by player_id, created_at;

-- "Compañeros habituales": vista derivada, NUNCA una tabla propia
-- (decisión de diseño, docs/02_DOMAIN_MODEL.md §3)
create view public.player_partner_stats as
select
  tm1.player_id,
  tm2.player_id as partner_id,
  count(*) as matches_together
from public.team_members tm1
join public.team_members tm2
  on tm1.team_id = tm2.team_id and tm1.player_id <> tm2.player_id
group by tm1.player_id, tm2.player_id;

-- ---------------------------------------------------------------------------
-- 7. Índices críticos de performance (docs/03_DATABASE_SCHEMA.md §8)
-- ---------------------------------------------------------------------------
create index idx_matches_tournament_status on public.matches (tournament_id, status);
create index idx_rating_events_player_created on public.rating_events (player_id, created_at desc);
create index idx_tournaments_published_start on public.tournaments (is_published, start_date);
create index idx_team_members_player on public.team_members (player_id);
create index idx_club_memberships_club on public.club_memberships (club_id);
create index idx_user_roles_user on public.user_roles (user_id);
create index idx_matches_court_status on public.matches (court_id, status);

-- ---------------------------------------------------------------------------
-- 8. Triggers de updated_at
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'players', 'clubs', 'courts', 'organizers', 'club_memberships',
    'tournaments', 'tournament_categories', 'tournament_groups',
    'tournament_phases', 'teams', 'matches'
  ]
  loop
    execute format(
      'create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end $$;
