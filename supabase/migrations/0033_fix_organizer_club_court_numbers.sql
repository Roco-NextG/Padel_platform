-- ============================================================================
-- Padel Platform — Migración 0033: corrige el número de pista al crear un
-- club como Organizador (0031).
--
-- Bug real encontrado al verificar en vivo: create_club_as_organizer()
-- insertaba las pistas sin la columna `number` (solo name/status). "Añadir
-- pista" (insertCourt, courtRepository.ts) calcula el próximo número como
-- max(existing.number) + 1 — con todas en null, siempre da 1, así que la
-- pista nueva salía nombrada "Pista 1" otra vez en vez de "Pista 3".
-- ============================================================================

create or replace function public.create_club_as_organizer(p_name text, p_city text, p_court_count int)
returns uuid
language plpgsql
security definer
as $$
declare
  v_organizer public.organizers;
  v_club_id uuid;
  i int;
begin
  select o.* into v_organizer
  from public.role_assignments ra
  join public.organizers o on o.id = ra.organizer_id
  where ra.user_id = auth.uid() and ra.role = 'ORGANIZADOR'
  limit 1;

  if v_organizer.id is null and not public.is_admin() then
    raise exception 'create_club_as_organizer: solo una cuenta Organizador puede crear un club nuevo';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'create_club_as_organizer: el nombre del club es obligatorio';
  end if;
  if p_court_count is null or p_court_count < 1 or p_court_count > 20 then
    raise exception 'create_club_as_organizer: la cantidad de pistas debe ser entre 1 y 20';
  end if;

  insert into public.clubs (name, city, contact_email, contact_first_name, contact_last_name, contact_phone, created_by_organizer_id)
  values (
    trim(p_name),
    nullif(trim(coalesce(p_city, '')), ''),
    v_organizer.contact_email,
    v_organizer.contact_first_name,
    v_organizer.contact_last_name,
    v_organizer.contact_phone,
    v_organizer.id
  )
  returning id into v_club_id;

  for i in 1..p_court_count loop
    insert into public.courts (club_id, name, number, status) values (v_club_id, 'Pista ' || i, i, 'AVAILABLE');
  end loop;

  return v_club_id;
end;
$$;

-- Backfill: pistas ya creadas por esta RPC antes del fix, con number null.
-- row_number() sobre el orden de creación reconstruye el mismo "Pista N"
-- que ya tienen en el nombre en la inmensa mayoría de los casos (nadie las
-- renombró todavía en el tiempo que estuvo el bug).
with numbered as (
  select id, row_number() over (partition by club_id order by created_at) as rn
  from public.courts
  where number is null
)
update public.courts c
set number = numbered.rn
from numbered
where c.id = numbered.id;
