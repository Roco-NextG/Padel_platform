import { RATING_CONFIG, matchTypeToReason } from "./config";
import { computeMarginFactor, computeTeamDelta, updateRatingDeviation } from "./delta";
import { computePartnerWeight } from "./partnerSplit";
import { computeTeamRating, expectedScore } from "./teamRating";
import {
  PlayerRatingState,
  RatingEventOutput,
  RatingMatchInput,
  RatingValidationError,
  TeamRatingState,
} from "./types";

function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function validate(input: RatingMatchInput): void {
  if (input.winner !== "A" && input.winner !== "B") {
    throw new RatingValidationError(`winner inválido: ${input.winner}`);
  }
  if (input.gamesWonA < 0 || input.gamesWonB < 0) {
    throw new RatingValidationError("gamesWonA/gamesWonB no pueden ser negativos");
  }
  if (!Number.isFinite(input.gamesWonA) || !Number.isFinite(input.gamesWonB)) {
    throw new RatingValidationError("gamesWonA/gamesWonB deben ser números válidos");
  }
  for (const team of [input.teamA, input.teamB]) {
    const [p1, p2] = team.players;
    if (p1.playerId === p2.playerId) {
      throw new RatingValidationError("un equipo no puede tener el mismo jugador dos veces");
    }
    for (const p of [p1, p2]) {
      if (p.ratingDeviation <= 0) {
        throw new RatingValidationError(`ratingDeviation debe ser > 0 (jugador ${p.playerId})`);
      }
    }
  }
  const allIds = [...input.teamA.players, ...input.teamB.players].map((p) => p.playerId);
  if (new Set(allIds).size !== allIds.length) {
    throw new RatingValidationError("un jugador no puede estar en ambos equipos");
  }
}

function combinedRD(team: TeamRatingState): number {
  return (team.players[0].ratingDeviation + team.players[1].ratingDeviation) / 2;
}

function splitTeamDelta(
  team: TeamRatingState,
  teamDelta: number,
  matchId: string,
  reason: "TOURNAMENT_MATCH" | "COMPETITIVE_MATCH",
  algorithmVersion: string
): RatingEventOutput[] {
  const [p1, p2] = team.players;
  const w1 = computePartnerWeight(p1.rating, p2.rating, teamDelta);
  const w2 = computePartnerWeight(p2.rating, p1.rating, teamDelta);

  return [
    ratingEventFor(p1, p2.playerId, teamDelta * w1, matchId, reason, algorithmVersion),
    ratingEventFor(p2, p1.playerId, teamDelta * w2, matchId, reason, algorithmVersion),
  ];
}

function ratingEventFor(
  player: PlayerRatingState,
  partnerId: string,
  individualDelta: number,
  matchId: string,
  reason: "TOURNAMENT_MATCH" | "COMPETITIVE_MATCH",
  algorithmVersion: string
): RatingEventOutput {
  return {
    playerId: player.playerId,
    matchId,
    partnerId,
    oldRating: round(player.rating),
    newRating: round(player.rating + individualDelta),
    oldRD: round(player.ratingDeviation),
    newRD: round(updateRatingDeviation(player.ratingDeviation)),
    reason,
    algorithmVersion,
  };
}

/**
 * Aplica el resultado de UN partido ya confirmado y devuelve los 4
 * RatingEvent (2 por equipo) a persistir. No escribe nada por sí mismo —
 * es lógica pura (docs/09_TECHNICAL_ARCHITECTURE.md §2) — el caller
 * (Match Engine / capa de aplicación) es responsable de:
 *   1. Solo invocar esta función cuando Match.status pasa a CONFIRMED
 *      (docs/05_RATING_ENGINE.md §9 — "partido no confirmado no genera RatingEvent").
 *   2. Persistir cada RatingEventOutput como fila de `rating_events`.
 *   3. Actualizar `player.current_rating` como proyección del último evento.
 */
export function applyMatchResult(input: RatingMatchInput): RatingEventOutput[] {
  validate(input);

  const algorithmVersion = input.algorithmVersion ?? RATING_CONFIG.ALGORITHM_VERSION;
  const reason = matchTypeToReason(input.matchType);

  const teamARating = computeTeamRating(input.teamA);
  const teamBRating = computeTeamRating(input.teamB);

  const expectedA = expectedScore(teamARating, teamBRating);
  const expectedB = 1 - expectedA;

  const actualA = input.winner === "A" ? 1 : 0;
  const actualB = input.winner === "B" ? 1 : 0;

  const gamesWinner = input.winner === "A" ? input.gamesWonA : input.gamesWonB;
  const gamesLoser = input.winner === "A" ? input.gamesWonB : input.gamesWonA;
  const margin = computeMarginFactor(gamesWinner, gamesLoser);

  const deltaA = computeTeamDelta({
    expected: expectedA,
    actual: actualA,
    combinedRD: combinedRD(input.teamA),
    matchType: input.matchType,
    marginFactor: margin,
  });
  const deltaB = computeTeamDelta({
    expected: expectedB,
    actual: actualB,
    combinedRD: combinedRD(input.teamB),
    matchType: input.matchType,
    marginFactor: margin,
  });

  return [
    ...splitTeamDelta(input.teamA, deltaA, input.matchId, reason, algorithmVersion),
    ...splitTeamDelta(input.teamB, deltaB, input.matchId, reason, algorithmVersion),
  ];
}

/**
 * Recalculo en cadena (docs/05_RATING_ENGINE.md §8): dada una lista de
 * partidos en orden cronológico y el estado inicial de cada jugador
 * afectado, reproduce `applyMatchResult` secuencialmente, actualizando el
 * estado de cada jugador tras cada partido. Se usa tanto para construir el
 * historial desde cero como para recalcular todo lo posterior a una
 * corrección de resultado histórico.
 */
export function replayRatingHistory(
  matchesInChronologicalOrder: RatingMatchInput[],
  initialStates: Record<string, PlayerRatingState>
): RatingEventOutput[] {
  const state = new Map<string, PlayerRatingState>(
    Object.entries(initialStates).map(([id, s]) => [id, { ...s }])
  );
  const allEvents: RatingEventOutput[] = [];

  const getState = (p: PlayerRatingState): PlayerRatingState =>
    state.get(p.playerId) ?? p;

  for (const match of matchesInChronologicalOrder) {
    const liveInput: RatingMatchInput = {
      ...match,
      teamA: { players: [getState(match.teamA.players[0]), getState(match.teamA.players[1])] },
      teamB: { players: [getState(match.teamB.players[0]), getState(match.teamB.players[1])] },
    };
    const events = applyMatchResult(liveInput);
    for (const ev of events) {
      state.set(ev.playerId, {
        playerId: ev.playerId,
        rating: ev.newRating,
        ratingDeviation: ev.newRD,
      });
    }
    allEvents.push(...events);
  }

  return allEvents;
}
