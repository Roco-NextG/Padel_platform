-- ============================================================================
-- Padel Platform — Migración 0011: partidos
-- ============================================================================

create type public.match_status as enum
  ('SCHEDULED', 'IN_PROGRESS', 'PENDING_CONFIRMATION', 'CONFIRMED', 'DISPUTED', 'CANCELLED');

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
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
  status public.match_status not null default 'SCHEDULED',
  winner_team_id uuid references public.teams(id) on delete set null,
  match_type public.match_type not null default 'TOURNAMENT',
  is_paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  constraint matches_team_a_not_team_b check (team_a_id is distinct from team_b_id),
  constraint matches_is_paused_only_in_progress check (not is_paused or status = 'IN_PROGRESS')
);
create trigger matches_set_updated_at before update on public.matches
  for each row execute function public.set_updated_at();
create unique index matches_phase_round_unique on public.matches (phase_id, round_index);
create index idx_matches_tournament_status on public.matches (tournament_id, status);
create index idx_matches_court_status on public.matches (court_id, status);

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

grant all on public.matches, public.set_scores, public.match_confirmations to service_role;
grant select, insert, update, delete on public.matches, public.set_scores, public.match_confirmations to authenticated;
grant select on public.matches, public.set_scores, public.match_confirmations to anon;
