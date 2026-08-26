"use client";

import { useState, useTransition } from "react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { Trophy, Warning, X } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { swapBracketSlotsAction } from "../application/bracketActions";
import { type BracketRoundView, type BracketTeamInfo } from "../domain/bracket";

function teamLabel(team: BracketTeamInfo | null): string {
  if (!team) return "Por definir";
  return team.players.map((p) => `${p.firstName} ${p.lastName}`.trim()).join(" / ");
}

function TeamRow({
  id,
  team,
  isWinner,
  position,
  draggable,
}: {
  id: string;
  team: BracketTeamInfo | null;
  isWinner: boolean;
  position: "top" | "bottom";
  draggable: boolean;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id, disabled: !draggable });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id, disabled: !draggable });

  return (
    <div
      ref={(el) => {
        setDragRef(el);
        setDropRef(el);
      }}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      className={cn(
        "flex items-center gap-2 px-2.5 py-2 transition-colors",
        position === "top" ? "rounded-t-md border-b border-border" : "rounded-b-md",
        isWinner ? "bg-accent-muted" : "bg-surface",
        draggable && "cursor-grab touch-none active:cursor-grabbing",
        isDragging && "opacity-30",
        isOver && "shadow-[inset_0_0_0_2px_var(--accent-strong)]"
      )}
    >
      {team?.seed ? (
        <span className={cn("w-4 shrink-0 text-[10px]", isWinner ? "text-accent-text/70" : "text-muted-foreground")}>{team.seed}</span>
      ) : (
        <span className="w-4 shrink-0" />
      )}
      <Avatar name={teamLabel(team)} className={cn("size-6 text-[9px]", isWinner && "bg-accent text-accent-foreground")} />
      <span className={cn("truncate text-xs", isWinner ? "font-semibold text-accent-text" : "text-muted-foreground")}>
        {teamLabel(team)}
      </span>
    </div>
  );
}

/** Anatomía calcada de .bmatch/.bteam (padel-platform.html): una sola ronda por bloque — el layout de "varias rondas lado a lado" lo arma phase-flow.tsx, una ronda por sección de scroll. `editable` solo debe venir en true para la primera fase generada del cuadro (drag & drop de emparejamientos). */
export function BracketColumn({
  round,
  editable,
  tournamentId,
}: {
  round: BracketRoundView;
  editable: boolean;
  tournamentId: string;
}) {
  const [matches, setMatches] = useState(round.matches);
  const [warning, setWarning] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const [matchAId, sideA] = String(event.active.id).split(":") as [string, "A" | "B"];
    const [matchBId, sideB] = String(event.over.id).split(":") as [string, "A" | "B"];
    if (matchAId === matchBId) return;

    const matchA = matches.find((m) => m.matchId === matchAId);
    const matchB = matches.find((m) => m.matchId === matchBId);
    if (!matchA || !matchB) return;

    const movingFromA = sideA === "A" ? matchA.teamA : matchA.teamB;
    const movingFromB = sideB === "A" ? matchB.teamA : matchB.teamB;

    const previous = matches;
    setWarning(null);
    setMatches((prev) =>
      prev.map((m) => {
        if (m.matchId === matchAId) return sideA === "A" ? { ...m, teamA: movingFromB } : { ...m, teamB: movingFromB };
        if (m.matchId === matchBId) return sideB === "A" ? { ...m, teamA: movingFromA } : { ...m, teamB: movingFromA };
        return m;
      })
    );

    startTransition(async () => {
      const result = await swapBracketSlotsAction(tournamentId, matchAId, sideA, matchBId, sideB);
      if (result.error) {
        setMatches(previous);
        setWarning(result.error);
        return;
      }
      if (result.warning) setWarning(result.warning);
    });
  }

  const grid = (
    <div className="flex w-[236px] shrink-0 flex-col justify-around gap-5" style={{ minHeight: `${matches.length * 84}px` }}>
      {matches.map((m) => {
        const isLive = m.status === "IN_PROGRESS";
        const isFinalWinner = round.type === "FINAL" && m.winnerTeamId;
        const slotDraggable = editable && m.status === "SCHEDULED" && !!m.matchId;
        return (
          <div key={`${round.phaseId}-${m.roundIndex}`} className="flex flex-col gap-3">
            <div className={cn("relative overflow-hidden rounded-md border border-border shadow-sm", isLive && "border-transparent shadow-glow")}>
              {isLive && (
                <span className="absolute -top-2.5 right-2.5 z-10 flex items-center gap-1 rounded-full border border-surface bg-accent-muted px-1.5 py-0.5 text-[8.5px] font-bold text-accent-text">
                  <span className="size-1.5 animate-pulse rounded-full bg-accent-strong" />
                  EN VIVO
                </span>
              )}
              <TeamRow
                id={`${m.matchId}:A`}
                team={m.teamA}
                isWinner={m.winnerTeamId === m.teamA?.teamId}
                position="top"
                draggable={slotDraggable && !!m.teamA}
              />
              <TeamRow
                id={`${m.matchId}:B`}
                team={m.teamB}
                isWinner={m.winnerTeamId === m.teamB?.teamId}
                position="bottom"
                draggable={slotDraggable && !!m.teamB}
              />
            </div>
            {isFinalWinner && (
              <div className="flex items-center gap-2 rounded-md bg-inverse px-3 py-2.5 text-xs text-inverse-foreground">
                <Trophy className="size-4 text-accent-strong" weight="fill" />
                <span className="font-medium">Campeón</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  if (!editable) return grid;

  return (
    <div className="flex flex-col gap-2">
      {warning && (
        <div className="flex items-start gap-2 rounded-md border border-warning-muted bg-warning-muted px-3 py-2 text-[11px] text-warning">
          <Warning className="mt-0.5 size-3.5 shrink-0" weight="fill" />
          <span className="flex-1">{warning}</span>
          <button type="button" onClick={() => setWarning(null)} aria-label="Cerrar aviso" className="shrink-0">
            <X className="size-3.5" />
          </button>
        </div>
      )}
      <DndContext onDragEnd={handleDragEnd}>{grid}</DndContext>
    </div>
  );
}
