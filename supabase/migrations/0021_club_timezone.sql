-- Zona horaria configurable por club/organizador (antes fija en código,
-- América/Caracas hardcodeado) — cada partido se muestra en la hora local
-- de la sede donde se juega, no en una constante global.
alter table public.clubs add column time_zone text not null default 'America/Caracas';
alter table public.organizers add column time_zone text not null default 'America/Caracas';
