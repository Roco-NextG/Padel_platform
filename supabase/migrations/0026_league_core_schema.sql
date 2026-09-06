-- ============================================================================
-- Padel Platform — Migración 0026: ligas (jornadas + tabla de posiciones)
--
-- Modelo paralelo a torneos (0009): leagues/league_categories/league_rounds
-- en vez de tournaments/tournament_categories/tournament_phases+groups. Una
-- Liga no tiene fase de grupos ni bracket — cada categoría es directamente
-- un round-robin entre TODAS sus parejas, repartido en "jornadas"
-- (league_rounds), cada una con su propia ventana de fechas.
--
-- teams/team_members y matches/set_scores se REUTILIZAN sin cambios de
-- forma — un equipo de Liga es indistinguible de un equipo de Torneo salvo
-- por a qué categoría apunta (columna nueva league_category_id, exclusiva
-- con tournament_category_id), y un partido de Liga usa el mismo
-- submit_match_result/set_scores que un partido de Torneo (ver 0027 para el
-- ajuste de RLS/RPC necesario para que eso funcione).
-- ============================================================================

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  club_id uuid not null references public.clubs(id) on delete restrict,
  organizer_id uuid references public.organizers(id) on delete restrict,
  is_published boolean not null default false,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger leagues_set_updated_at before update on public.leagues
  for each row execute function public.set_updated_at();

create table public.league_categories (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  name text not null,
  level text,
  gender_restriction public.gender_type,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint league_categories_level_gender_unique unique (league_id, level, gender_restriction)
);
create trigger league_categories_set_updated_at before update on public.league_categories
  for each row execute function public.set_updated_at();

-- Una "jornada": una ronda del round-robin de una categoría, con su propia
-- ventana de fechas — generada de una sola vez por generateRoundRobinSchedule
-- (packages/tournament-engine), nunca a mano fila por fila.
create table public.league_rounds (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.league_categories(id) on delete cascade,
  order_index int not null,
  window_start date,
  window_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, order_index)
);
create trigger league_rounds_set_updated_at before update on public.league_rounds
  for each row execute function public.set_updated_at();

-- Confirmado antes de esta migración: 0 filas de teams con
-- tournament_category_id null hoy, así que el XOR de abajo no rompe datos
-- existentes.
alter table public.teams add column league_category_id uuid references public.league_categories(id) on delete cascade;
alter table public.teams add constraint teams_exactly_one_category check (
  (tournament_category_id is not null) <> (league_category_id is not null)
);
create index idx_teams_league_category on public.teams (league_category_id);

alter type public.match_type add value 'LEAGUE';

alter table public.matches add column league_id uuid references public.leagues(id) on delete cascade;
alter table public.matches add column league_round_id uuid references public.league_rounds(id) on delete set null;
alter table public.matches add constraint matches_not_both_tournament_and_league check (
  not (tournament_id is not null and league_id is not null)
);
-- Análogo a matches_phase_round_unique (0011) — round_index acá es "qué
-- partido simultáneo dentro de la jornada", no un orden temporal.
create unique index matches_league_round_slot_unique on public.matches (league_round_id, round_index);
create index idx_matches_league_status on public.matches (league_id, status);

grant all on public.leagues, public.league_categories, public.league_rounds to service_role;
grant select, insert, update, delete on public.leagues, public.league_categories, public.league_rounds to authenticated;
grant select on public.leagues, public.league_categories, public.league_rounds to anon;
