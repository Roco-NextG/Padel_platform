-- ============================================================================
-- Padel Platform — Migración 0005: esquema de billing real (Stripe) + panel
-- de admin v2 (sidebar, Overview/Users completos, Suscripciones/System)
--
-- Solo Club y Organizador tienen plan — Jugador siempre gratis (confirmado
-- con el usuario). account_billing es una tabla separada de clubs/organizers
-- a propósito: clubs_update/organizers_update (0003_rls.sql) ya dejan que el
-- propio Club/Organizador escriba su fila, y este esquema otorga privilegios
-- de tabla en bloque a `authenticated` confiando entera mente en RLS por
-- fila, no por columna — poner columnas de billing directo en clubs dejaría
-- que un club se auto-marcara payment_status = 'ACTIVE' desde el browser.
-- Una tabla aparte, 100% admin-only, cierra ese hueco sin tocar las policies
-- que ya existen.
-- ============================================================================

create type public.payment_status as enum
  ('NONE', 'ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'UNPAID');

-- ---------------------------------------------------------------------------
-- plans — catálogo administrado a mano desde /admin/sistema/configuracion
-- ---------------------------------------------------------------------------
-- Sin fila "Free": account_billing.plan_id = null ES el plan gratis. El
-- admin llena stripe_price_id después de crear el Product/Price real en su
-- propio Stripe Dashboard — nada de este código necesita conocer un Price ID
-- real de antemano.
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  monthly_price_cents integer not null default 0,
  currency text not null default 'USD',
  stripe_price_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger plans_set_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- account_billing — un registro por club/organizer con plan o billing real
-- ---------------------------------------------------------------------------
create table public.account_billing (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  organizer_id uuid references public.organizers(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  payment_status public.payment_status not null default 'NONE',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_billing_scope_check check (
    (club_id is not null and organizer_id is null) or
    (organizer_id is not null and club_id is null)
  )
);
create unique index account_billing_club_unique on public.account_billing(club_id) where club_id is not null;
create unique index account_billing_organizer_unique on public.account_billing(organizer_id) where organizer_id is not null;
create trigger account_billing_set_updated_at before update on public.account_billing
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- billing_events — historial de cambios de plan Y log real de webhooks de
-- Stripe (misma tabla: alimenta el KPI de "pasó de free a pago", la página
-- Payments y System logs — no hace falta inventar dos tablas separadas).
-- ---------------------------------------------------------------------------
create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  organizer_id uuid references public.organizers(id) on delete cascade,
  event_type text not null,
  from_plan_id uuid references public.plans(id),
  to_plan_id uuid references public.plans(id),
  payment_status_after public.payment_status,
  amount_cents integer,
  stripe_event_id text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  constraint billing_events_scope_check check (
    (club_id is not null and organizer_id is null) or
    (organizer_id is not null and club_id is null)
  )
);
-- Guardia de idempotencia para reintentos de webhook (Stripe reenvía si el
-- endpoint no responde a tiempo): insert ... on conflict do nothing.
create unique index billing_events_stripe_event_id_unique
  on public.billing_events (stripe_event_id) where stripe_event_id is not null;

-- ---------------------------------------------------------------------------
-- account_activity — "última vez que usó la app", actualizado en el sign-in
-- ---------------------------------------------------------------------------
-- Una fila por auth.users, no por role_assignment: un usuario puede tener
-- más de un rol (ver "hacer admin" más abajo), así que esto vive a nivel de
-- cuenta, no de asignación de rol.
create table public.account_activity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_active_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Datos de contacto en clubs/organizers — la identidad de la persona
-- invitada, hoy sin modelar (solo existía contact_email genérico del club).
-- ---------------------------------------------------------------------------
alter table public.clubs
  add column contact_first_name text,
  add column contact_last_name text,
  add column contact_phone text;

alter table public.organizers
  add column contact_first_name text,
  add column contact_last_name text,
  add column contact_phone text;

-- players necesita is_active (hoy solo clubs/organizers lo tienen, pero el
-- filtro Activo/Inactivo del panel debe aplicar también a Jugador) y phone
-- (el formulario base de alta lo pide siempre, incluso para Jugador).
alter table public.players
  add column is_active boolean not null default true,
  add column phone text;

-- ---------------------------------------------------------------------------
-- Reparación de FKs en pending_invites — sin esto, "borrar usuario" falla
-- ---------------------------------------------------------------------------
-- auth_user_id/invited_by no tenían ON DELETE (default RESTRICT): borrar
-- casi cualquier auth.users real (toda invitación aceptada, todo admin que
-- alguna vez invitó) hubiera fallado con una violación de FK. invited_by
-- pasa a nullable para poder ir a SET NULL.
alter table public.pending_invites
  alter column invited_by drop not null;

alter table public.pending_invites
  drop constraint pending_invites_auth_user_id_fkey,
  add constraint pending_invites_auth_user_id_fkey
    foreign key (auth_user_id) references auth.users(id) on delete set null;

alter table public.pending_invites
  drop constraint pending_invites_invited_by_fkey,
  add constraint pending_invites_invited_by_fkey
    foreign key (invited_by) references auth.users(id) on delete set null;

-- Amplía el check de rol para permitir invitar Jugadores también (antes solo
-- ADMIN/CLUB/ORGANIZADOR) — redeem_invite() (0004) ya es agnóstico al rol,
-- no necesita cambios.
alter table public.pending_invites
  drop constraint pending_invites_role_check,
  add constraint pending_invites_role_check check (role in ('ADMIN', 'CLUB', 'ORGANIZADOR', 'JUGADOR'));

alter table public.pending_invites
  drop constraint pending_invites_scope_check,
  add constraint pending_invites_scope_check check (
    (role = 'CLUB' and club_id is not null and organizer_id is null) or
    (role = 'ORGANIZADOR' and organizer_id is not null and club_id is null) or
    (role in ('ADMIN', 'JUGADOR') and club_id is null and organizer_id is null)
  );

-- ---------------------------------------------------------------------------
-- Grants base para las tablas nuevas — mismo patrón que 0002_schema.sql.
-- ---------------------------------------------------------------------------
grant all on public.plans, public.account_billing, public.billing_events, public.account_activity to service_role;
grant select, insert, update, delete on public.plans, public.account_billing, public.billing_events, public.account_activity to authenticated;
grant select on public.plans, public.account_billing, public.billing_events, public.account_activity to anon;
