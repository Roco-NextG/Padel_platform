-- ============================================================================
-- Padel Platform — Migración 0016: datos para Discovery con mapa
--
-- El mapa necesita coordenadas de club (no existían) y un costo de
-- inscripción visible en el detalle del torneo al hacer click en el pin.
--
-- IMPORTANTE — entry_fee es SOLO INFORMATIVO. No crea ningún flujo de pago,
-- no toca Stripe/Coins (eso sigue fuera del MVP, ver docs/08_MVP_SCOPE.md).
-- Es un campo de texto/número que el organizador llena para que el jugador
-- sepa cuánto cuesta antes de inscribirse por fuera de la plataforma (o
-- presencialmente) — igual que hoy no hay pago dentro de la app para nada.
-- ============================================================================

alter table public.clubs
  add column if not exists latitude numeric(9,6),
  add column if not exists longitude numeric(9,6);

alter table public.clubs
  add constraint clubs_latitude_range check (latitude is null or (latitude between -90 and 90)),
  add constraint clubs_longitude_range check (longitude is null or (longitude between -180 and 180));

create index if not exists idx_clubs_lat_lng on public.clubs (latitude, longitude)
  where latitude is not null and longitude is not null;

alter table public.tournaments
  add column if not exists entry_fee numeric(10,2),
  add column if not exists entry_fee_currency text default 'USD';

alter table public.tournaments
  add constraint tournaments_entry_fee_nonnegative check (entry_fee is null or entry_fee >= 0);

-- Índice de apoyo para "torneos publicados con club geolocalizado" — la
-- consulta que arma el mapa (join tournaments -> clubs, is_published = true,
-- club con coordenadas).
create index if not exists idx_tournaments_published_club on public.tournaments (club_id)
  where is_published = true;
