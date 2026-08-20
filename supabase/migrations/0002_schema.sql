-- ============================================================================
-- Padel Platform — Migración 0002: esquema mínimo para el panel de admin v1
--
-- Modelo de 3 roles + admin: Admin ve y administra todo; Club y Organizador
-- crean torneos y solo ven jugadores inscritos en SUS PROPIOS torneos (esa
-- regla vive en el schema de torneos/inscripción, que todavía no existe en
-- esta fase — acá solo se sienta la base de cuentas + roles). JUGADOR se
-- incluye en el enum ya mismo (barato hoy, evita un ALTER TYPE ADD VALUE
-- más adelante) aunque nada lo asigna todavía desde esta UI.
-- ============================================================================

create extension if not exists pgcrypto;

create type app_role as enum ('ADMIN', 'CLUB', 'ORGANIZADOR', 'JUGADOR');
create type invite_status as enum ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- clubs / organizers
-- ---------------------------------------------------------------------------
create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text,
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger clubs_set_updated_at before update on public.clubs
  for each row execute function public.set_updated_at();

create table public.organizers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text,
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger organizers_set_updated_at before update on public.organizers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- role_assignments — quién es qué, y sobre cuál club/organizador
-- ---------------------------------------------------------------------------
create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  club_id uuid references public.clubs(id) on delete cascade,
  organizer_id uuid references public.organizers(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint role_assignments_scope_check check (
    (role = 'CLUB' and club_id is not null and organizer_id is null) or
    (role = 'ORGANIZADOR' and organizer_id is not null and club_id is null) or
    (role in ('ADMIN', 'JUGADOR') and club_id is null and organizer_id is null)
  )
);

-- NULLS NOT DISTINCT desde el día uno — el esquema anterior aprendió esto
-- tarde (0014_admin_panel_rpc.sql): un UNIQUE normal deja que dos filas con
-- club_id/organizer_id en NULL (rol ADMIN/JUGADOR) se dupliquen sin avisar.
create unique index role_assignments_scope_unique
  on public.role_assignments (user_id, role, club_id, organizer_id)
  nulls not distinct;

-- ---------------------------------------------------------------------------
-- players — placeholder mínimo, solo para existir como FK a futuro
-- ---------------------------------------------------------------------------
-- Deliberadamente SIN club_id/organizer_id: "Club X solo ve jugadores
-- inscritos en sus propios torneos" es una relación de inscripción a
-- torneo, no una propiedad del jugador — y torneos/inscripción no son
-- parte de esta fase. Agregar esa columna ahora sería adivinar una forma
-- que probablemente esté mal cuando el esquema real de inscripción llegue.
create table public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- pending_invites — metadata de negocio, nunca la barrera de seguridad
-- ---------------------------------------------------------------------------
-- El token real que crea la cuenta lo genera y valida Supabase Auth
-- (auth.admin.inviteUserByEmail) — esta tabla solo guarda qué rol/alcance
-- corresponde asignar cuando se acepte, y el estado para que el admin vea
-- invitaciones pendientes/vencidas. Ver 0004_invite_rpc.sql.
create table public.pending_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role app_role not null check (role in ('ADMIN', 'CLUB', 'ORGANIZADOR')),
  club_id uuid references public.clubs(id) on delete cascade,
  organizer_id uuid references public.organizers(id) on delete cascade,
  invited_by uuid not null references auth.users(id),
  auth_user_id uuid references auth.users(id),
  status invite_status not null default 'PENDING',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint pending_invites_scope_check check (
    (role = 'CLUB' and club_id is not null and organizer_id is null) or
    (role = 'ORGANIZADOR' and organizer_id is not null and club_id is null) or
    (role = 'ADMIN' and club_id is null and organizer_id is null)
  )
);

-- ---------------------------------------------------------------------------
-- Grants base — sin esto, RLS por sí sola no alcanza (0006_grants.sql del
-- esquema anterior existió justo porque esto se olvidó la primera vez).
-- ---------------------------------------------------------------------------
grant all on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
