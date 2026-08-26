"use client";

import { useState, useTransition } from "react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { swapGroupTeamsAction } from "../application/bracketActions";
import type { GroupStandingsView } from "../infrastructure/bracketRepository";

/** Anatomía calcada de .group-card/.g-row (padel-platform.html): top 2 de cada grupo clasifican al cuadro, mismo criterio que balancedSeeding usa para sembrar. */
const QUALIFYING_SLOTS = 2;

type Standing = GroupStandingsView["standings"][number];

function GroupRow({
  standing,
  position,
  qualifies,
  draggable,
}: {
  standing: Standing;
  position: number;
  qualifies: boolean;
  draggable: boolean;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: standing.teamId, disabled: !draggable });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: standing.teamId, disabled: !draggable });

  return (
    <div
      ref={(el) => {
        setDragRef(el);
        setDropRef(el);
      }}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      className={cn(
        "flex items-center gap-3 rounded-md px-2 py-2 transition-colors",
        qualifies && "bg-accent-muted",
        draggable && "cursor-grab touch-none active:cursor-grabbing",
        isDragging && "opacity-30",
        isOver && "shadow-[inset_0_0_0_2px_var(--accent-strong)]"
      )}
    >
      <span className={cn("w-4 text-xs font-medium", qualifies ? "text-accent-text" : "text-muted-foreground")}>{position}</span>
      <Avatar name={standing.teamLabel} className={cn("size-7 text-[10px]", qualifies && "bg-accent text-accent-foreground")} />
      <span className={cn("flex-1 truncate text-xs font-medium", qualifies ? "text-accent-text" : "text-foreground")}>
        {standing.teamLabel}
      </span>
      <span className="w-14 text-right text-[10.5px] tabular-nums text-muted-foreground">
        {standing.matchesWon}/{standing.matchesPlayed} PG
      </span>
      <span className="w-14 text-right text-[10.5px] tabular-nums text-muted-foreground">
        sets {standing.setDiff >= 0 ? `+${standing.setDiff}` : standing.setDiff}
      </span>
      <span className="w-10 text-right text-[10.5px] tabular-nums text-muted-foreground">
        {standing.gameDiff >= 0 ? `+${standing.gameDiff}` : standing.gameDiff}
      </span>
      {qualifies && (
        <Badge tone="accent" className="shrink-0">
          Clasifica
        </Badge>
      )}
      {standing.requiresManualResolution && (
        <Badge tone="warning" className="shrink-0">
          Empate
        </Badge>
      )}
    </div>
  );
}

export function GroupStandings({
  groups: initialGroups,
  editable,
  tournamentId,
}: {
  groups: GroupStandingsView[];
  /** Solo debe venir en true cuando ningún partido de ningún grupo se jugó todavía — mover parejas después invalidaría estadísticas ya calculadas (regla dura, reforzada también en swapGroupTeams). */
  editable: boolean;
  tournamentId: string;
}) {
  const [groups, setGroups] = useState(initialGroups);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const teamAId = String(event.active.id);
    const teamBId = String(event.over.id);

    const all = groups.flatMap((g) => g.standings);
    const entryA = all.find((s) => s.teamId === teamAId);
    const entryB = all.find((s) => s.teamId === teamBId);
    if (!entryA || !entryB) return;

    const previous = groups;
    setError(null);
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        standings: g.standings.map((s) => {
          if (s.teamId === teamAId) return { ...s, teamId: entryB.teamId, teamLabel: entryB.teamLabel };
          if (s.teamId === teamBId) return { ...s, teamId: entryA.teamId, teamLabel: entryA.teamLabel };
          return s;
        }),
      }))
    );

    startTransition(async () => {
      const result = await swapGroupTeamsAction(tournamentId, teamAId, teamBId);
      if (result.error) {
        setGroups(previous);
        setError(result.error);
      }
    });
  }

  const grid = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {groups.map((g) => (
        <div key={g.groupId} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold text-foreground">{g.groupName}</h3>
          <div className="flex flex-col">
            {g.standings.map((s, i) => (
              <GroupRow key={s.teamId} standing={s} position={i + 1} qualifies={i < QUALIFYING_SLOTS} draggable={editable} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (!editable) return grid;

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      <DndContext onDragEnd={handleDragEnd}>{grid}</DndContext>
    </div>
  );
}
