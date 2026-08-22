-- ============================================================================
-- Padel Platform — Migración 0006: RLS de las tablas de billing (0005)
--
-- Todo admin-only por ahora — no existe todavía ninguna superficie de Club/
-- Organizador que necesite leer su propio plan/estado de pago (eso llega
-- con el panel de Club/Organizador, fuera de esta fase). account_activity
-- es la única excepción: cada cuenta puede leer/escribir su propia fila
-- para que el sign-in actualice last_active_at sin necesitar una RPC
-- security definer.
-- ============================================================================

alter table public.plans enable row level security;

create policy plans_admin_only on public.plans for all
  using (public.is_admin()) with check (public.is_admin());

alter table public.account_billing enable row level security;

create policy account_billing_admin_only on public.account_billing for all
  using (public.is_admin()) with check (public.is_admin());

alter table public.billing_events enable row level security;

create policy billing_events_admin_only on public.billing_events for all
  using (public.is_admin()) with check (public.is_admin());

alter table public.account_activity enable row level security;

create policy account_activity_rw on public.account_activity for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
