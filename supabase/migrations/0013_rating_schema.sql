-- ============================================================================
-- Padel Platform — Migración 0013: rating
--
-- Ported verbatim desde el esquema viejo — sin acoplamiento al modelo de
-- roles en la definición misma de estas tablas/vistas.
-- ============================================================================

create type public.rating_reason as enum ('TOURNAMENT_MATCH', 'COMPETITIVE_MATCH');

create table public.rating_events (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  partner_id uuid references public.players(id) on delete set null,
  old_rating numeric(5,2) not null,
  new_rating numeric(5,2) not null,
  old_rd numeric(6,2) not null,
  new_rd numeric(6,2) not null,
  reason public.rating_reason not null,
  algorithm_version text not null,
  superseded boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index idx_rating_events_player_created on public.rating_events (player_id, created_at desc);
-- Índice único parcial (where not superseded): permite que una corrección
-- reemplace el evento vigente de un jugador para un partido sin chocar con
-- el viejo, que queda superseded en vez de borrado.
create unique index rating_events_player_match_active_unique
  on public.rating_events (player_id, match_id) where not superseded;

create view public.rating_history as
select * from public.rating_events where superseded = false order by player_id, created_at;

-- "Compañeros habituales": vista derivada, nunca una tabla propia.
create view public.player_partner_stats as
select tm1.player_id, tm2.player_id as partner_id, count(*) as matches_together
from public.team_members tm1
join public.team_members tm2 on tm1.team_id = tm2.team_id and tm1.player_id <> tm2.player_id
group by tm1.player_id, tm2.player_id;

grant all on public.rating_events to service_role;
grant select, insert on public.rating_events to authenticated;
grant select on public.rating_events, public.rating_history, public.player_partner_stats to anon, authenticated;
