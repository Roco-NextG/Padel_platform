-- ============================================================================
-- Padel Platform — Migración 0017: torneos cercanos por distancia (sin mapa)
--
-- Reemplaza el enfoque de mapa (Google Maps) por una lista ordenada por
-- distancia real al usuario, calculada en el servidor con la fórmula de
-- Haversine — sin PostGIS (no hace falta para este volumen de datos) y sin
-- ningún servicio externo de geocoding/mapas. clubs.latitude/longitude ya
-- existen desde 0016.
--
-- Esta función NO es security definer: respeta el RLS normal del rol que
-- la llama (anon incluido) — a diferencia de las RPC de escritura de
-- migraciones anteriores, acá no hace falta ningún privilegio elevado,
-- solo lee lo que ya es públicamente legible.
-- ============================================================================

create or replace function public.nearby_published_tournaments(
  p_lat numeric,
  p_lng numeric,
  p_limit int default 50
)
returns table (
  tournament_id uuid,
  name text,
  start_date date,
  cover_image_url text,
  entry_fee numeric,
  entry_fee_currency text,
  club_id uuid,
  club_name text,
  club_logo_url text,
  club_city text,
  distance_km numeric
) as $$
  select
    t.id,
    t.name,
    t.start_date,
    t.cover_image_url,
    t.entry_fee,
    t.entry_fee_currency,
    c.id,
    c.name,
    c.branding ->> 'logo_url',
    c.city,
    round(
      (
        6371 * acos(
          least(1::numeric, greatest(-1::numeric,
            cos(radians(p_lat)) * cos(radians(c.latitude)) *
            cos(radians(c.longitude) - radians(p_lng)) +
            sin(radians(p_lat)) * sin(radians(c.latitude))
          ))
        )
      )::numeric,
      1
    ) as distance_km
  from public.tournaments t
  join public.clubs c on c.id = t.club_id
  where t.is_published = true
    and c.latitude is not null
    and c.longitude is not null
  order by distance_km asc
  limit p_limit;
$$ language sql stable;

comment on function public.nearby_published_tournaments is
  'Torneos publicados ordenados por distancia real (Haversine, km) a un punto dado. '
  'Los torneos cuyo club no tiene lat/lng quedan afuera a propósito — la app debe '
  'listarlos aparte con una consulta directa a tournaments/clubs (RLS ya lo permite, '
  'sin RPC), no como parte de esta función.';
