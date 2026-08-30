-- ============================================================================
-- Padel Platform — Migración 0023: bucket de Storage para logo/banner de torneo
--
-- tournaments.logo_url y tournaments.cover_image_url ya existen desde
-- 0009_tournament_core_schema.sql — nunca se usaron porque no había forma de
-- subir la imagen. Este bucket sigue el mismo patrón exacto de
-- sponsor-logos (0017_sponsors.sql): público de lectura, escritura/borrado
-- solo para is_tournament_staff().
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('tournament-branding', 'tournament-branding', true)
on conflict (id) do nothing;

drop policy if exists tournament_branding_read on storage.objects;
create policy tournament_branding_read on storage.objects for select using (bucket_id = 'tournament-branding');

drop policy if exists tournament_branding_write on storage.objects;
create policy tournament_branding_write on storage.objects for insert with check (bucket_id = 'tournament-branding' and public.is_tournament_staff());

drop policy if exists tournament_branding_delete on storage.objects;
create policy tournament_branding_delete on storage.objects for delete using (bucket_id = 'tournament-branding' and public.is_tournament_staff());
