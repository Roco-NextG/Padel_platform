-- ============================================================================
-- Padel Platform — Migración 0012: RLS de partidos
--
-- Ported estructuralmente sin cambios desde el esquema viejo (b0362d4:
-- 0002_rls.sql) — is_tournament_manager/owns_player ya están reescritos
-- contra el modelo nuevo (0010), estas policies solo llaman a través de
-- ellos, igual que antes.
-- ============================================================================

-- is_match_participant() se define recién acá (no en 0010, junto a
-- is_tournament_manager/owns_player) porque referencia public.matches, que
-- no existe hasta 0011 — evita una referencia hacia adelante. Ported
-- verbatim del esquema viejo, sin acoplamiento al modelo de roles.
create or replace function public.is_match_participant(target_match_id uuid) returns boolean as $$
  select exists (
    select 1
    from public.matches m
    join public.team_members tm on tm.team_id in (m.team_a_id, m.team_b_id)
    join public.players p on p.id = tm.player_id
    where m.id = target_match_id and p.user_id = auth.uid()
  );
$$ language sql stable security definer;

alter table public.matches enable row level security;

create policy matches_select on public.matches for select
  using (
    tournament_id is null
    or exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and (t.is_published or public.is_tournament_manager(t.id))
    )
  );

create policy matches_write on public.matches for all
  using (tournament_id is not null and public.is_tournament_manager(tournament_id))
  with check (tournament_id is not null and public.is_tournament_manager(tournament_id));

alter table public.set_scores enable row level security;

create policy set_scores_select on public.set_scores for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id and (
        m.tournament_id is null
        or exists (select 1 from public.tournaments t where t.id = m.tournament_id and (t.is_published or public.is_tournament_manager(t.id)))
      )
    )
  );

create policy set_scores_write on public.set_scores for all
  using (exists (select 1 from public.matches m where m.id = match_id and m.tournament_id is not null and public.is_tournament_manager(m.tournament_id)))
  with check (exists (select 1 from public.matches m where m.id = match_id and m.tournament_id is not null and public.is_tournament_manager(m.tournament_id)));

alter table public.match_confirmations enable row level security;

create policy match_confirmations_select on public.match_confirmations for select
  using (
    public.owns_player(player_id)
    or public.is_match_participant(match_id)
    or exists (select 1 from public.matches m where m.id = match_id and m.tournament_id is not null and public.is_tournament_manager(m.tournament_id))
  );

create policy match_confirmations_write on public.match_confirmations for all
  using (public.owns_player(player_id)) with check (public.owns_player(player_id));
