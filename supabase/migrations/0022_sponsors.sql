-- ============================================================================
-- Padel Platform — Migración 0022: Sponsor (docs/11_UX_HANDOFF.md §3.6, paso
-- 2 de Crear Torneo) + bucket de Storage para sus logos
--
-- FK elegida: tournament_id, NO club_id — a diferencia de la idea original
-- de 09_UX_HANDOFF.md §4 #2 (un roster de sponsors reusable por club), el
-- paso 2 del wizard los sube AL CREAR ese torneo puntual, exactamente como
-- TournamentCategory (mismo paso, mismo patrón, misma RLS vía
-- is_tournament_manager(tournament_id)). Un sponsor de un torneo nunca debe
-- poder aparecer/editarse desde otro torneo del mismo club por accidente —
-- si más adelante hace falta reusar el mismo logo entre torneos, se vuelve a
-- subir cada vez; duplicar un upload es más barato que el riesgo de que una
-- pantalla que liste "sponsors del club" termine mezclando contenido de
-- torneos distintos.
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
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and (t.is_published or public.is_tournament_manager(t.id))
    )
  );

create policy sponsors_write on public.sponsors for all
  using (public.is_tournament_manager(tournament_id))
  with check (public.is_tournament_manager(tournament_id));

-- ---------------------------------------------------------------------------
-- Storage: bucket sponsor-logos
-- ---------------------------------------------------------------------------
-- Público de lectura (los logos se muestran en el Composer de contenido y en
-- el cuadro, ambos accesibles sin sesión igual que el resto de imágenes de
-- marca de la app — mismo criterio que Club.branding.logo_url).
insert into storage.buckets (id, name, public)
values ('sponsor-logos', 'sponsor-logos', true)
on conflict (id) do nothing;

create policy sponsor_logos_read on storage.objects for select
  using (bucket_id = 'sponsor-logos');

create policy sponsor_logos_write on storage.objects for insert
  with check (bucket_id = 'sponsor-logos' and public.is_tournament_staff());

create policy sponsor_logos_delete on storage.objects for delete
  using (bucket_id = 'sponsor-logos' and public.is_tournament_staff());
