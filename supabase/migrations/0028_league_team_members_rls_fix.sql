-- ============================================================================
-- Padel Platform — Migración 0028: corrige team_members_select/write para
-- equipos de Liga
--
-- Bug real encontrado al verificar en vivo "inscribir pareja" en una Liga:
-- team_members_select/write (0010_tournament_rls.sql) NUNCA pasaban por la
-- lógica genérica de teams_select/teams_write (0027) — tenían su propio
-- join, hardcodeado contra tournament_categories únicamente. El comentario
-- de 0027 que decía "ya pasan por teams sin tocarlas" era incorrecto: el
-- INSERT a team_members de una pareja de Liga fallaba con "new row violates
-- row-level security policy for table team_members".
-- ============================================================================

drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members for select
  using (
    exists (
      select 1 from public.teams tm
      left join public.tournament_categories tc on tc.id = tm.tournament_category_id
      left join public.tournaments t on t.id = tc.tournament_id
      left join public.league_categories lc on lc.id = tm.league_category_id
      left join public.leagues l on l.id = lc.league_id
      where tm.id = team_id
        and (
          (t.id is not null and (t.is_published or public.is_tournament_manager(t.id)))
          or (l.id is not null and (l.is_published or public.is_league_manager(l.id)))
        )
    )
  );

drop policy if exists team_members_write on public.team_members;
create policy team_members_write on public.team_members for all
  using (
    exists (
      select 1 from public.teams tm
      left join public.tournament_categories tc on tc.id = tm.tournament_category_id
      left join public.league_categories lc on lc.id = tm.league_category_id
      where tm.id = team_id
        and (
          (tc.id is not null and public.is_tournament_manager(tc.tournament_id))
          or (lc.id is not null and public.is_league_manager(lc.league_id))
        )
    )
  )
  with check (
    exists (
      select 1 from public.teams tm
      left join public.tournament_categories tc on tc.id = tm.tournament_category_id
      left join public.league_categories lc on lc.id = tm.league_category_id
      where tm.id = team_id
        and (
          (tc.id is not null and public.is_tournament_manager(tc.tournament_id))
          or (lc.id is not null and public.is_league_manager(lc.league_id))
        )
    )
  );
