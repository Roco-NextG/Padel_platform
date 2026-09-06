import { TeamId } from "./types";

export interface RoundRobinRound {
  matches: [TeamId, TeamId][];
  /** Equipo libre esta ronda — solo puede haber uno, y solo si la cantidad de equipos es impar. */
  byeTeamId: TeamId | null;
}

/**
 * Genera el calendario completo de un round-robin a una vuelta ("todos
 * contra todos", repartido en jornadas) mediante el método del círculo: se
 * fija el primer equipo y se rota el resto una posición por ronda.
 *
 * Con n equipos (par) produce n-1 rondas de n/2 partidos cada una, sin
 * descansos. Con n impar se agrega un cupo ficticio de descanso, produciendo
 * n rondas de (n-1)/2 partidos — cada equipo descansa exactamente una vez,
 * en una ronda distinta.
 *
 * En cualquiera de los dos casos, cada par de equipos se enfrenta EXACTAMENTE
 * una vez a lo largo de todo el calendario.
 */
export function generateRoundRobinSchedule(teamIds: TeamId[]): RoundRobinRound[] {
  if (teamIds.length < 2) return [];

  const hasBye = teamIds.length % 2 !== 0;
  const slots: (TeamId | null)[] = hasBye ? [...teamIds, null] : [...teamIds];
  const n = slots.length;
  const numRounds = n - 1;
  const half = n / 2;

  let arr = slots;
  const rounds: RoundRobinRound[] = [];

  for (let round = 0; round < numRounds; round++) {
    const matches: [TeamId, TeamId][] = [];
    let byeTeamId: TeamId | null = null;

    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a === null) byeTeamId = b;
      else if (b === null) byeTeamId = a;
      else matches.push([a, b]);
    }
    rounds.push({ matches, byeTeamId });

    // Rotación del método del círculo: el primer equipo queda fijo, el
    // resto rota una posición (el último pasa a ser el segundo).
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr = [fixed, ...rest];
  }

  return rounds;
}
