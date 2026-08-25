-- finish_tournament marcaba TODO el torneo como FINISHED apenas se confirmaba
-- la final de UNA sola categoría, sin chequear las demás categorías del mismo
-- torneo (bug encontrado en vivo: un torneo con 3 categorías pasó a
-- "Finalizado" con solo la final de una de ellas jugada). Se agrega el
-- chequeo agregado acá, en la función, para que valga para cualquier llamador
-- futuro y no solo para reconcileBracket.
create or replace function public.finish_tournament(p_tournament_id uuid, p_completed_match_id uuid)
returns public.tournaments as $$
declare
  v_result public.tournaments;
  v_completed public.matches;
  v_phase_type public.phase_type;
  v_pending_categories int;
begin
  if public.is_tournament_manager(p_tournament_id) then
    null;
  elsif public.is_match_participant(p_completed_match_id) then
    select * into v_completed from public.matches where id = p_completed_match_id;

    if v_completed.id is null or v_completed.tournament_id is distinct from p_tournament_id then
      raise exception 'finish_tournament: el partido % no pertenece al torneo %', p_completed_match_id, p_tournament_id;
    end if;
    if v_completed.status <> 'CONFIRMED' or v_completed.winner_team_id is null then
      raise exception 'finish_tournament: el partido % no está confirmado', p_completed_match_id;
    end if;

    select ph.type into v_phase_type from public.tournament_phases ph where ph.id = v_completed.phase_id;
    if v_phase_type is distinct from 'FINAL' then
      raise exception 'finish_tournament: el partido % no es la final del torneo', p_completed_match_id;
    end if;
  else
    raise exception 'finish_tournament: no tienes permiso sobre el torneo %', p_tournament_id;
  end if;

  select count(*) into v_pending_categories
  from public.tournament_categories tc
  where tc.tournament_id = p_tournament_id
    and not exists (
      select 1
      from public.tournament_phases ph
      join public.matches m on m.phase_id = ph.id
      where ph.category_id = tc.id
        and ph.type = 'FINAL'
        and m.status = 'CONFIRMED'
        and m.winner_team_id is not null
    );

  if v_pending_categories > 0 then
    select * into v_result from public.tournaments where id = p_tournament_id;
    return v_result;
  end if;

  update public.tournaments set status = 'FINISHED' where id = p_tournament_id returning * into v_result;

  insert into public.audit_log (actor_user_id, entity_type, entity_id, action, after)
  values (auth.uid(), 'tournament', p_tournament_id, 'FINISHED', to_jsonb(v_result));

  return v_result;
end;
$$ language plpgsql security definer;
