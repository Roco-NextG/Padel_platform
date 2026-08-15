-- ============================================================================
-- Padel Platform — Migración 0005: auditoría universal + WCAG server-side en Club
--
-- Cierra dos gaps encontrados al revisar 0003_club_organizer_rpc.sql:
--
-- 1) AUDITORÍA INCOMPLETA: `update_club_branding` auditaba manualmente, pero
--    la policy RLS directa `clubs_update` sigue permitiendo cambiar
--    name/city/address sin dejar rastro — docs/03_DATABASE_SCHEMA.md §6 exige
--    auditoría en TODA escritura de Club, no solo branding.
--
-- 2) VALIDACIÓN WCAG SOLO EN CLIENTE: apps/web/src/lib/color/contrast.ts
--    valida en el navegador, pero como Supabase expone la base directamente,
--    cualquiera puede saltarse esa validación llamando a update_club_branding
--    (o a un futuro UPDATE directo) sin pasar por el cliente. La regla dura
--    de docs/07_UX_UI_ARCHITECTURE.md §4 exige que el sistema mismo ajuste o
--    advierta, no que confíe en la validación del cliente.
--
-- SOLUCIÓN: en vez de duplicar ambas validaciones dentro de cada función RPC
-- (lo que solo protegería ese camino específico), se implementan como
-- TRIGGERS sobre la tabla `clubs` — se aplican sin importar si la escritura
-- llega vía RPC (`create_club`, `update_club_branding`) o vía UPDATE directo
-- permitido por la policy RLS `clubs_update`. Esto es estructuralmente más
-- robusto que "recordar" envolver cada función nueva en la validación
-- correcta.
--
-- Los INSERT/UPDATE manuales a `audit_log` dentro de `create_club` y
-- `update_club_branding` (0003) se retiran para no duplicar filas — el
-- trigger de auditoría ahora es la única fuente.
--
-- (Renumerada de 0004 a 0005 al integrarla: 0004_rating_rpc.sql ya ocupaba
-- ese número en el repo. Contenido sin cambios respecto al original.)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- WCAG contrast — misma fórmula y mismos umbrales que
-- apps/web/src/lib/color/contrast.ts, para que cliente y servidor nunca
-- diverjan en qué paleta consideran válida.
-- ---------------------------------------------------------------------------
create or replace function public.hex_channel_linear(c_255 numeric)
returns numeric as $$
declare
  s numeric := c_255 / 255.0;
begin
  if s <= 0.03928 then
    return s / 12.92;
  end if;
  return power((s + 0.055) / 1.055, 2.4);
end;
$$ language plpgsql immutable;

create or replace function public.relative_luminance(hex text)
returns numeric as $$
declare
  clean text := lower(regexp_replace(hex, '^#', ''));
  bytes bytea;
begin
  if clean !~ '^[0-9a-f]{6}$' then
    raise exception 'relative_luminance: color hex inválido: %', hex;
  end if;
  bytes := decode(clean, 'hex');
  return 0.2126 * public.hex_channel_linear(get_byte(bytes, 0))
       + 0.7152 * public.hex_channel_linear(get_byte(bytes, 1))
       + 0.0722 * public.hex_channel_linear(get_byte(bytes, 2));
end;
$$ language plpgsql immutable;

create or replace function public.contrast_ratio(hex_a text, hex_b text)
returns numeric as $$
declare
  l1 numeric := public.relative_luminance(hex_a);
  l2 numeric := public.relative_luminance(hex_b);
begin
  return (greatest(l1, l2) + 0.05) / (least(l1, l2) + 0.05);
end;
$$ language plpgsql immutable;

-- Mismos pares y mismo umbral (WCAG_AA_LARGE_TEXT = 3) que
-- validateBrandingContrast() en el cliente. Devuelve NULL si todo pasa, o un
-- texto con el detalle de qué par falló (para el mensaje de error).
create or replace function public.validate_branding_contrast(p_branding jsonb)
returns text as $$
declare
  v_primary text := p_branding->>'primary_color';
  v_secondary text := p_branding->>'secondary_color';
  v_accent text := p_branding->>'accent';
  v_required constant numeric := 3.0;
  v_issues text[] := '{}';
  v_ratio numeric;
begin
  if v_primary is not null then
    v_ratio := public.contrast_ratio(v_primary, '#ffffff');
    if v_ratio < v_required then
      v_issues := array_append(v_issues, format('primary-on-white: %s (mínimo %s)', round(v_ratio, 2), v_required));
    end if;
    v_ratio := public.contrast_ratio(v_primary, '#0c0a09');
    if v_ratio < v_required then
      v_issues := array_append(v_issues, format('primary-on-black: %s (mínimo %s)', round(v_ratio, 2), v_required));
    end if;
  end if;

  if v_secondary is not null then
    v_ratio := public.contrast_ratio(v_secondary, '#ffffff');
    if v_ratio < v_required then
      v_issues := array_append(v_issues, format('secondary-on-white: %s (mínimo %s)', round(v_ratio, 2), v_required));
    end if;
  end if;

  if v_accent is not null then
    v_ratio := public.contrast_ratio(v_accent, '#ffffff');
    if v_ratio < v_required then
      v_issues := array_append(v_issues, format('accent-on-white: %s (mínimo %s)', round(v_ratio, 2), v_required));
    end if;
  end if;

  if array_length(v_issues, 1) is null then
    return null;
  end if;
  return array_to_string(v_issues, '; ');
end;
$$ language plpgsql immutable;

create or replace function public.enforce_branding_contrast()
returns trigger as $$
declare
  v_issues text;
begin
  v_issues := public.validate_branding_contrast(new.branding);
  if v_issues is not null then
    raise exception 'branding no cumple contraste WCAG AA: %', v_issues
      using hint = 'Ajusta los colores del club antes de guardar (docs/07_UX_UI_ARCHITECTURE.md §4)';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_clubs_branding_contrast on public.clubs;
create trigger trg_clubs_branding_contrast
  before insert or update of branding on public.clubs
  for each row execute function public.enforce_branding_contrast();

-- ---------------------------------------------------------------------------
-- Auditoría universal de Club — cubre RPC y UPDATE/INSERT/DELETE directo.
-- ---------------------------------------------------------------------------
create or replace function public.audit_clubs_changes()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (actor_user_id, entity_type, entity_id, action, before, after)
    values (auth.uid(), 'club', new.id, 'CREATE', null, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log (actor_user_id, entity_type, entity_id, action, before, after)
    values (auth.uid(), 'club', new.id, 'UPDATE', to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_log (actor_user_id, entity_type, entity_id, action, before, after)
    values (auth.uid(), 'club', old.id, 'DELETE', to_jsonb(old), null);
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_clubs_audit on public.clubs;
create trigger trg_clubs_audit
  after insert or update or delete on public.clubs
  for each row execute function public.audit_clubs_changes();

-- ---------------------------------------------------------------------------
-- 0003 actualizado: se retira el insert manual a audit_log (ahora lo hace el
-- trigger) para no duplicar filas. El resto de la lógica (autorización,
-- alta del rol scoped) no cambia.
-- ---------------------------------------------------------------------------
create or replace function public.create_club(
  p_name text,
  p_city text default null,
  p_address text default null,
  p_branding jsonb default '{}'::jsonb
)
returns public.clubs as $$
declare
  v_club public.clubs;
begin
  if not (public.has_role('CLUB_OWNER') or public.is_admin()) then
    raise exception 'create_club: se requiere el rol CLUB_OWNER (otorgado por un admin) para crear un club';
  end if;

  insert into public.clubs (name, city, address, branding)
  values (p_name, p_city, p_address, p_branding)
  returning * into v_club;

  insert into public.user_roles (user_id, role, club_id)
  values (auth.uid(), 'CLUB_OWNER', v_club.id)
  on conflict (user_id, role, club_id, organizer_id) do nothing;

  return v_club;
end;
$$ language plpgsql security definer;

create or replace function public.update_club_branding(
  p_club_id uuid,
  p_branding jsonb
)
returns public.clubs as $$
declare
  v_after public.clubs;
begin
  if not public.is_club_manager(p_club_id) then
    raise exception 'update_club_branding: no tienes permiso sobre este club';
  end if;

  update public.clubs set branding = p_branding where id = p_club_id
  returning * into v_after;

  return v_after;
end;
$$ language plpgsql security definer;
