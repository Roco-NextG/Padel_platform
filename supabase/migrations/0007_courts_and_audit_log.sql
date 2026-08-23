-- ============================================================================
-- Padel Platform — Migración 0007: pistas + audit log
--
-- audit_log no estaba en el plan original de esta fase, pero varias RPCs
-- que se portan tal cual en 0016 (submit_match_result, create_bracket_match,
-- finish_tournament, apply_match_correction, record_rating_events) escriben
-- ahí como parte de su cuerpo — portarlas "byte-a-byte" sin reinventar su
-- lógica exige que la tabla exista. Mismo shape que el esquema viejo
-- (b0362d4:supabase/migrations/0001_schema.sql), agregada acá porque es la
-- primera migración de esta fase que la necesita.
-- ============================================================================

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

alter table public.audit_log enable row level security;

create policy audit_log_select on public.audit_log for select using (public.is_admin());
-- Sin policy de insert para clientes: se escribe desde funciones security
-- definer, nunca desde el cliente directo.

grant all on public.audit_log to service_role;
grant select, insert on public.audit_log to authenticated;

-- ---------------------------------------------------------------------------
-- is_tournament_staff() — adelantado desde donde vivía en el esquema viejo
-- (junto a las RPCs de inscripción) porque courts_select ya lo necesita acá
-- abajo: un Organizador tiene que poder ver las pistas de CUALQUIER club al
-- elegir dónde alojar su torneo (el picker de "Datos" del wizard, ver
-- decisión de diseño del plan), no solo las de un club con el que ya tiene
-- un torneo en marcha.
-- ---------------------------------------------------------------------------
create or replace function public.is_tournament_staff()
returns boolean as $$
  select public.is_admin() or exists (
    select 1 from public.role_assignments
    where user_id = auth.uid() and role in ('CLUB', 'ORGANIZADOR')
  );
$$ language sql stable security definer;

-- ---------------------------------------------------------------------------
-- courts — solo los clubs tienen pistas físicas (courts_write scoped a
-- is_club(club_id): un Organizador nunca es DUEÑO de pistas, solo las usa
-- al elegir un club anfitrión). La lectura es más abierta a propósito
-- (is_tournament_staff(), no solo is_club(club_id)) — un Organizador
-- necesita ver el número/nombres de pistas de CUALQUIER club para poder
-- elegirlo como sede antes de que exista ningún torneo que los vincule.
-- ---------------------------------------------------------------------------
create type public.court_status as enum ('AVAILABLE', 'MAINTENANCE', 'DISABLED');

create table public.courts (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  number int,
  indoor boolean not null default false,
  status public.court_status not null default 'AVAILABLE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger courts_set_updated_at before update on public.courts
  for each row execute function public.set_updated_at();

alter table public.courts enable row level security;

-- No público (using(true), como el esquema viejo) pero sí visible para
-- cualquier Club/Organizador autenticado — no solo el dueño — por la razón
-- de arriba (picker de sede). Sigue sin haber superficie pública/anónima
-- todavía en esta fase, mismo criterio ya aplicado a clubs/organizers en
-- 0003_rls.sql.
create policy courts_select on public.courts for select using (public.is_tournament_staff());
create policy courts_write on public.courts for all
  using (public.is_club(club_id)) with check (public.is_club(club_id));

grant all on public.courts to service_role;
grant select, insert, update, delete on public.courts to authenticated;
grant select on public.courts to anon;
