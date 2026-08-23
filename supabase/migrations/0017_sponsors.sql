-- ============================================================================
-- Padel Platform — Migración 0017: sponsors + bucket de Storage
--
-- Ported verbatim del esquema viejo (b0362d4:0022_sponsors.sql) — FK a
-- tournament_id (no club_id, a propósito: un sponsor se sube al crear ESE
-- torneo puntual, nunca se reusa entre torneos por accidente), RLS vía
-- is_tournament_manager/is_tournament_staff, ambas ya redefinidas contra el
-- modelo nuevo.
-- ============================================================================

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  logo_url text not null,
  created_at timestamptz not null default now()
);
create index sponsors_tournament_id_idx on public.sponsors(tournament_id);

alter table public.sponsors enable row level security;

create policy sponsors_select on public.sponsors for select
  using (exists (select 1 from public.tournaments t where t.id = tournament_id and (t.is_published or public.is_tournament_manager(t.id))));

create policy sponsors_write on public.sponsors for all
  using (public.is_tournament_manager(tournament_id)) with check (public.is_tournament_manager(tournament_id));

grant all on public.sponsors to service_role;
grant select, insert, update, delete on public.sponsors to authenticated;
grant select on public.sponsors to anon;

-- ---------------------------------------------------------------------------
-- Storage: bucket sponsor-logos — público de lectura (logos se muestran sin
-- sesión, mismo criterio que el resto de imágenes de marca de la app).
--
-- storage.objects/storage.buckets viven en el schema `storage`, NO `public`
-- — el DROP SCHEMA public CASCADE del reset (0001_reset.sql) nunca los
-- tocó. Las policies de sponsor-logos del esquema viejo (pre-reset,
-- b0362d4:0022_sponsors.sql) siguen ahí. drop policy if exists antes de
-- cada create, mismo patrón que el resto de este proyecto usa para
-- resultar idempotente.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('sponsor-logos', 'sponsor-logos', true)
on conflict (id) do nothing;

drop policy if exists sponsor_logos_read on storage.objects;
create policy sponsor_logos_read on storage.objects for select using (bucket_id = 'sponsor-logos');

drop policy if exists sponsor_logos_write on storage.objects;
create policy sponsor_logos_write on storage.objects for insert with check (bucket_id = 'sponsor-logos' and public.is_tournament_staff());

drop policy if exists sponsor_logos_delete on storage.objects;
create policy sponsor_logos_delete on storage.objects for delete using (bucket_id = 'sponsor-logos' and public.is_tournament_staff());
