import { generateRoundRobinSchedule } from "@padel-platform/tournament-engine";
import { createClient } from "@/lib/supabase/server";
import { fetchTeamsForLeagueCategory } from "./leagueEnrollmentRepository";

/** Reparte el rango de fechas de la liga en `count` ventanas iguales — null si la liga no tiene ambas fechas cargadas (el campo es opcional). */
function computeRoundWindows(
  startDate: string | null,
  endDate: string | null,
  count: number
): { windowStart: string | null; windowEnd: string | null }[] {
  if (!startDate || !endDate || count === 0) {
    return Array.from({ length: count }, () => ({ windowStart: null, windowEnd: null }));
  }
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const totalMs = end.getTime() - start.getTime();
  if (totalMs <= 0) {
    return Array.from({ length: count }, () => ({ windowStart: startDate, windowEnd: endDate }));
  }

  const sliceMs = totalMs / count;
  const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);
  return Array.from({ length: count }, (_, i) => {
    const windowStart = new Date(start.getTime() + i * sliceMs);
    const windowEnd = i === count - 1 ? end : new Date(start.getTime() + (i + 1) * sliceMs - 86_400_000);
    return { windowStart: toIsoDate(windowStart), windowEnd: toIsoDate(windowEnd) };
  });
}

/**
 * Genera el calendario completo de una categoría de Liga de una sola vez —
 * round-robin a una vuelta vía generateRoundRobinSchedule (packages/
 * tournament-engine, método del círculo), nunca a mano. No hay "byes" que
 * insertar como fila: un equipo libre en una ronda simplemente no tiene
 * partido esa jornada (a diferencia del bye de bracket, que sí necesita un
 * partido placeholder para auto-avanzar).
 */
export async function generateLeagueSchedule(leagueId: string, categoryId: string): Promise<void> {
  const supabase = await createClient();

  const { data: existing } = await supabase.from("league_rounds").select("id").eq("category_id", categoryId).limit(1).maybeSingle();
  if (existing) throw new Error("Ya se generaron las jornadas para esta categoría.");

  const teams = await fetchTeamsForLeagueCategory(categoryId);
  if (teams.length < 2) throw new Error("Se necesitan al menos 2 parejas para generar las jornadas.");

  const { data: league, error: leagueError } = await supabase.from("leagues").select("start_date, end_date").eq("id", leagueId).single();
  if (leagueError) throw new Error(leagueError.message);

  const teamIds = teams.map((t) => t.teamId);
  const schedule = generateRoundRobinSchedule(teamIds);
  const windows = computeRoundWindows(league.start_date, league.end_date, schedule.length);

  for (let i = 0; i < schedule.length; i++) {
    const { data: round, error: roundError } = await supabase
      .from("league_rounds")
      .insert({ category_id: categoryId, order_index: i, window_start: windows[i].windowStart, window_end: windows[i].windowEnd })
      .select("id")
      .single();
    if (roundError) throw new Error(roundError.message);

    const { matches } = schedule[i];
    if (matches.length === 0) continue;

    const rows = matches.map(([teamAId, teamBId], slotIndex) => ({
      league_id: leagueId,
      league_round_id: round.id,
      round_index: slotIndex,
      team_a_id: teamAId,
      team_b_id: teamBId,
      status: "SCHEDULED" as const,
      match_type: "LEAGUE" as const,
    }));
    const { error: matchesError } = await supabase.from("matches").insert(rows);
    if (matchesError) throw new Error(matchesError.message);
  }
}
