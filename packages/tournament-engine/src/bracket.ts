import {
  BracketResult,
  BracketSlot,
  FirstRoundMatch,
  GroupConflict,
  GroupId,
  SeededTeam,
} from "./types";

/** Siguiente potencia de 2 >= n. */
export function nextPowerOfTwo(n: number): number {
  if (n < 1) throw new Error("n debe ser >= 1");
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Orden de seeding estándar de torneo (algoritmo fractal): para un cuadro
 * de `size` posiciones (potencia de 2), devuelve un array donde el índice
 * es la posición del cuadro (0-indexada) y el valor es el número de seed
 * que debe ocupar esa posición. Garantiza que seed 1 y seed 2 solo puedan
 * cruzarse en la final, seeds 1-4 solo en semifinal o después, etc.
 */
export function generateSeedOrder(size: number): number[] {
  if (size < 1 || (size & (size - 1)) !== 0) {
    throw new Error("size debe ser una potencia de 2");
  }
  let seeds = [1];
  while (seeds.length < size) {
    const n = seeds.length * 2;
    const next: number[] = [];
    for (const s of seeds) {
      next.push(s, n + 1 - s);
    }
    seeds = next;
  }
  return seeds;
}

/**
 * Ronda más temprana (1 = primera ronda) en la que dos posiciones del
 * cuadro podrían enfrentarse, dado el bracket estándar de eliminación simple.
 */
export function earliestPossibleRound(positionA: number, positionB: number): number {
  const xor = positionA ^ positionB;
  if (xor === 0) throw new Error("las posiciones deben ser distintas");
  const highestBit = 31 - Math.clz32(xor);
  return highestBit + 1;
}

/**
 * Genera el bracket completo a partir de una lista de equipos ya sembrados
 * (seed 1 = más fuerte). Soporta cualquier N (04_TOURNAMENT_ENGINE.md §5):
 * calcula bracket_size = siguiente potencia de 2, asigna byes a los mejores
 * seeds, y aplica el algoritmo de seeding estándar para el resto.
 *
 * Intenta además separar equipos del mismo grupo de origen (§5) con un
 * algoritmo de mejora local (hill-climbing) acotado: nunca bloquea la
 * generación del cuadro, y documenta los pares que no pudo separar.
 */
export function generateBracket(seededTeams: SeededTeam[]): BracketResult {
  const n = seededTeams.length;
  if (n < 2) throw new Error("se necesitan al menos 2 equipos para generar un bracket");

  const bracketSize = nextPowerOfTwo(n);
  const byes = bracketSize - n;
  const seedOrder = generateSeedOrder(bracketSize);

  const teamBySeed = new Map<number, SeededTeam>();
  for (const t of seededTeams) teamBySeed.set(t.seed, t);

  const initialSlots: BracketSlot[] = seedOrder.map((seed, position) => {
    const team = teamBySeed.get(seed);
    return {
      position,
      seed,
      teamId: team ? team.teamId : null,
      isBye: !team,
    };
  });

  const { slots, unresolvedGroupConflicts } = resolveGroupConflicts(
    initialSlots,
    seededTeams
  );

  const firstRoundMatches: FirstRoundMatch[] = [];
  for (let i = 0; i < slots.length; i += 2) {
    const slotA = slots[i];
    const slotB = slots[i + 1];
    const isByeMatch = slotA.isBye || slotB.isBye;
    firstRoundMatches.push({
      position: i / 2,
      teamAId: slotA.teamId,
      teamBId: slotB.teamId,
      isByeMatch,
      autoAdvanceTeamId: isByeMatch
        ? slotA.isBye
          ? slotB.teamId
          : slotA.teamId
        : null,
    });
  }

  return { bracketSize, byes, slots, firstRoundMatches, unresolvedGroupConflicts };
}

// ---------------------------------------------------------------------------
// Separación de grupo de origen (04_TOURNAMENT_ENGINE.md §4.3) — swap acotado
// por mitad, nunca bloqueante.
//
// Procedimiento exacto confirmado: tras la colocación por seed (§4.2), se
// revisa cada MITAD del cuadro — no cada ronda posible como hacía la versión
// anterior. Si dos parejas del mismo group_id cayeron en la misma mitad, se
// intercambia la posición de la más débil (seed más alto) de las dos con la
// pareja de rango de seed más cercano en la mitad opuesta — el ajuste mínimo
// necesario. Resultado neto: dos parejas del mismo grupo de origen solo
// podrían volver a enfrentarse en la final.
//
// Los seeds 1 y 2 NUNCA se usan como candidato de swap: por construcción de
// generateSeedOrder ya están en mitades opuestas (§4.2), y tocarlos acá para
// resolver el conflicto de OTRO par rompería esa garantía sin necesidad —
// con cualquier bracket no trivial sobran candidatos de seed cercano que no
// son 1 ni 2.
// ---------------------------------------------------------------------------

interface Conflict {
  i: number;
  j: number;
  groupId: GroupId;
}

function resolveGroupConflicts(
  initialSlots: BracketSlot[],
  seededTeams: SeededTeam[]
): { slots: BracketSlot[]; unresolvedGroupConflicts: GroupConflict[] } {
  const teamGroup = new Map<string, GroupId | null>();
  for (const t of seededTeams) teamGroup.set(t.teamId, t.groupId ?? null);

  const half = initialSlots.length / 2;
  const halfOf = (position: number): 0 | 1 => (position < half ? 0 : 1);

  const findSameHalfConflicts = (arr: BracketSlot[]): Conflict[] => {
    const list: Conflict[] = [];
    for (let i = 0; i < arr.length; i++) {
      if (!arr[i].teamId) continue;
      const gA = teamGroup.get(arr[i].teamId!);
      if (gA == null) continue;
      for (let j = i + 1; j < arr.length; j++) {
        if (!arr[j].teamId) continue;
        if (halfOf(arr[i].position) !== halfOf(arr[j].position)) continue;
        if (teamGroup.get(arr[j].teamId!) === gA) list.push({ i, j, groupId: gA });
      }
    }
    return list;
  };

  let slots = initialSlots.map((s) => ({ ...s }));
  const givenUp = new Set<string>();
  const maxIterations = Math.max(slots.length * 4, 20);

  for (let iterations = 0; iterations < maxIterations; iterations++) {
    const active = findSameHalfConflicts(slots).filter(
      (c) => !givenUp.has(pairKey(slots[c.i], slots[c.j]))
    );
    if (active.length === 0) break;

    const { i, j } = active[0];
    // reubicar a la más débil (seed más alto) de las dos parejas en conflicto
    const moveIdx = slots[i].seed > slots[j].seed ? i : j;
    const moving = slots[moveIdx];
    const targetHalf = halfOf(moving.position) === 0 ? 1 : 0;

    const candidates = slots
      .map((s, k) => ({ seed: s.seed, k }))
      .filter(({ k }) => slots[k].teamId && halfOf(slots[k].position) === targetHalf && slots[k].seed !== 1 && slots[k].seed !== 2)
      .sort((a, b) => Math.abs(a.seed - moving.seed) - Math.abs(b.seed - moving.seed));

    const conflictCountBefore = active.length;
    let swapped = false;
    for (const c of candidates) {
      const trial = swapTeams(slots, moveIdx, c.k);
      if (findSameHalfConflicts(trial).length < conflictCountBefore) {
        slots = trial;
        swapped = true;
        break;
      }
    }

    if (!swapped) {
      givenUp.add(pairKey(slots[i], slots[j]));
    }
  }

  const remaining = findSameHalfConflicts(slots);
  const unresolvedGroupConflicts: GroupConflict[] = remaining.map((c) => ({
    teamAId: slots[c.i].teamId!,
    teamBId: slots[c.j].teamId!,
    groupId: c.groupId,
    earliestPossibleRound: earliestPossibleRound(slots[c.i].position, slots[c.j].position),
  }));

  return { slots, unresolvedGroupConflicts };
}

function swapTeams(
  slots: BracketSlot[],
  indexA: number,
  indexB: number
): BracketSlot[] {
  const copy = slots.map((s) => ({ ...s }));
  const a = copy[indexA];
  const b = copy[indexB];
  copy[indexA] = { ...a, teamId: b.teamId, isBye: b.isBye, seed: b.seed };
  copy[indexB] = { ...b, teamId: a.teamId, isBye: a.isBye, seed: a.seed };
  return copy;
}

function pairKey(a: BracketSlot, b: BracketSlot): string {
  return [a.teamId, b.teamId].sort().join("::");
}
