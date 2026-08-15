import { cn } from "@/lib/utils";
import { phaseTypeLabel } from "../domain/bracket";
import type { BracketDisplayMatch, BracketDisplayRound } from "../infrastructure/tournamentRepository";
import { MatchStatusBadge } from "@/modules/matches/ui/match-status-badge";

/** 99px de contenido real (2 filas de equipo + divisor + fila de estado, con el padding del card) — 108 deja margen sin desperdiciar espacio. */
const CARD_HEIGHT = 108;
const CARD_WIDTH = 208;
const CONNECTOR_WIDTH = 40;
const BASE_GAP = 20;
const COLUMN_GAP = CARD_WIDTH + CONNECTOR_WIDTH;

/**
 * Espaciado calculado, no aproximado: en un árbol binario, si cada ronda
 * distribuye sus partidos con un gap g_r tal que g_r = CARD_HEIGHT + 2*g_{r-1}
 * y un offset superior acumulado t_r = t_{r-1} + (CARD_HEIGHT + g_{r-1}) / 2,
 * el centro vertical de cada partido cae exactamente en el punto medio entre
 * los dos partidos de la ronda anterior que lo alimentan — sin esto, las
 * líneas de conexión no cuadran salvo que las rondas tengan pocos partidos.
 */
function computeLayout(rounds: BracketDisplayRound[]) {
  const gaps: number[] = [BASE_GAP];
  const topOffsets: number[] = [0];
  for (let r = 1; r < rounds.length; r++) {
    gaps[r] = CARD_HEIGHT + 2 * gaps[r - 1];
    topOffsets[r] = topOffsets[r - 1] + (CARD_HEIGHT + gaps[r - 1]) / 2;
  }
  const round1Count = rounds[0]?.matches.length ?? 0;
  const totalHeight =
    round1Count > 0 ? round1Count * CARD_HEIGHT + (round1Count - 1) * gaps[0] : CARD_HEIGHT;
  return { gaps, topOffsets, totalHeight };
}

function cardTop(topOffsets: number[], gaps: number[], roundIdx: number, matchIndex: number): number {
  return topOffsets[roundIdx] + matchIndex * (CARD_HEIGHT + gaps[roundIdx]);
}

function HLine({ y, x1, x2 }: { y: number; x1: number; x2: number }) {
  return (
    <div className="absolute bg-border-strong" style={{ top: y, left: x1, width: x2 - x1, height: 2 }} />
  );
}

function VLine({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return (
    <div
      className="absolute bg-border-strong"
      style={{ left: x, top: Math.min(y1, y2), width: 2, height: Math.abs(y2 - y1) }}
    />
  );
}

function teamDisplayName(match: BracketDisplayMatch, side: "A" | "B"): string {
  if (match.status === null) return "Por definir";
  const name = side === "A" ? match.teamAName : match.teamBName;
  return name ?? "BYE";
}

function BracketMatchCard({ match }: { match: BracketDisplayMatch }) {
  const isPending = match.status === null;
  const isReady = match.status === "SCHEDULED" && match.teamAId != null && match.teamBId != null;

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col justify-center gap-1.5 overflow-hidden rounded-lg border px-3 py-2",
        isPending ? "border-dashed border-border bg-surface-secondary/40" : "border-border-strong bg-surface"
      )}
    >
      <TeamRow
        name={teamDisplayName(match, "A")}
        isWinner={match.winnerTeamId != null && match.winnerTeamId === match.teamAId}
        isPending={isPending}
      />
      <div className="h-px bg-border" />
      <TeamRow
        name={teamDisplayName(match, "B")}
        isWinner={match.winnerTeamId != null && match.winnerTeamId === match.teamBId}
        isPending={isPending}
      />
      {match.status && (
        <div className="mt-1 flex items-center gap-1.5">
          <MatchStatusBadge status={match.status} />
          {isReady && (
            <span className="flex items-center gap-1 text-xs font-medium text-accent">
              <span className="size-1.5 rounded-full bg-accent" />
              Listo para jugar
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function TeamRow({ name, isWinner, isPending }: { name: string; isWinner: boolean; isPending: boolean }) {
  return (
    <span
      className={cn(
        "truncate text-sm",
        isPending || name === "BYE"
          ? "italic text-muted-foreground"
          : isWinner
            ? "font-semibold text-foreground"
            : "text-foreground"
      )}
    >
      {name}
    </span>
  );
}

/** Vista de solo lectura del cuadro completo — cards de equipo, líneas de conexión y el indicador "Listo para jugar" (docs/07_UX_UI_ARCHITECTURE.md §2). Sin drag & drop: eso queda fuera de alcance. */
export function BracketView({ rounds }: { rounds: BracketDisplayRound[] }) {
  if (rounds.length === 0) return null;

  const { gaps, topOffsets, totalHeight } = computeLayout(rounds);
  const totalWidth = rounds.length * CARD_WIDTH + (rounds.length - 1) * CONNECTOR_WIDTH;

  return (
    <div className="overflow-x-auto pb-4">
      <div style={{ width: totalWidth }}>
        <div className="mb-4 flex">
          {rounds.map((round, roundIdx) => (
            <div
              key={round.roundNumber}
              style={{ width: roundIdx === rounds.length - 1 ? CARD_WIDTH : COLUMN_GAP }}
              className="shrink-0 text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              {phaseTypeLabel(round.type)}
            </div>
          ))}
        </div>

        <div className="relative" style={{ height: totalHeight }}>
          {rounds.map((round, roundIdx) => (
            <div key={round.roundNumber}>
              {round.matches.map((match) => (
                <div
                  key={match.matchIndex}
                  className="absolute"
                  style={{
                    left: roundIdx * COLUMN_GAP,
                    top: cardTop(topOffsets, gaps, roundIdx, match.matchIndex),
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                  }}
                >
                  <BracketMatchCard match={match} />
                </div>
              ))}
            </div>
          ))}

          {rounds.slice(1).map((round, offset) => {
            const roundIdx = offset + 1;
            const prevRoundIdx = roundIdx - 1;
            const xLeft = roundIdx * COLUMN_GAP - CONNECTOR_WIDTH;
            const xRight = roundIdx * COLUMN_GAP;
            const xMid = xLeft + CONNECTOR_WIDTH / 2;

            return round.matches.map((match) => {
              const centerChild0 =
                cardTop(topOffsets, gaps, prevRoundIdx, match.matchIndex * 2) + CARD_HEIGHT / 2;
              const centerChild1 =
                cardTop(topOffsets, gaps, prevRoundIdx, match.matchIndex * 2 + 1) + CARD_HEIGHT / 2;
              const centerParent = cardTop(topOffsets, gaps, roundIdx, match.matchIndex) + CARD_HEIGHT / 2;

              return (
                <div key={`connector-${round.roundNumber}-${match.matchIndex}`}>
                  <HLine y={centerChild0} x1={xLeft} x2={xMid} />
                  <HLine y={centerChild1} x1={xLeft} x2={xMid} />
                  <VLine x={xMid} y1={centerChild0} y2={centerChild1} />
                  <HLine y={centerParent} x1={xMid} x2={xRight} />
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}
