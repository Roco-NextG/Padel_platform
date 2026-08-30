"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ComponentType } from "react";
import { DotsThreeVertical, MapPin, Pause, Play, Prohibit } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { cancelMatchAction, pauseMatchAction, resumeMatchAction, setMatchCourtAction, startMatchAction } from "../application/matchActions";
import { MatchScoreboard } from "./match-scoreboard";
import { MATCH_DISPLAY_STATUS_META, matchDisplayStatus, type MatchListItem } from "../domain/match";
import { formatZonedTime } from "@/lib/timezone";

/** Borde/sombra por estado visual — mismo criterio que .match-card en padel-platform.html (live=glow, paused/disputed=borde izquierdo de color, cancelled=atenuado). */
const CARD_TREATMENT: Record<string, string> = {
  LIVE: "border-transparent shadow-glow",
  PAUSED: "border-l-4 border-l-pause",
  DISPUTED: "border-l-4 border-l-cancel",
  CANCELLED: "opacity-60 grayscale-[0.4]",
};

function formatTime(iso: string | null, timeZone: string): string {
  if (!iso) return "";
  return formatZonedTime(iso, timeZone);
}

export function MatchCard({
  match,
  courts,
  showTournamentName,
  onUpdate,
  onConfirmed,
}: {
  match: MatchListItem;
  courts: { id: string; name: string }[];
  showTournamentName: boolean;
  /** El padre (MatchList) es la única fuente de verdad — acá nunca duplicamos status/isPaused/etc. en estado local, para que los filtros y el orden de la grilla vean el cambio de inmediato (mismo bug que category-grid: estado optimista que no sube). */
  onUpdate: (patch: Partial<MatchListItem>) => void;
  onConfirmed: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [changingCourt, setChangingCourt] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const displayStatus = matchDisplayStatus(match);
  const meta = MATCH_DISPLAY_STATUS_META[displayStatus];
  const editable = displayStatus === "LIVE" || displayStatus === "PAUSED" || displayStatus === "DISPUTED";

  const timeText =
    displayStatus === "LIVE" || displayStatus === "PAUSED"
      ? match.actualStart
        ? `Desde ${formatTime(match.actualStart, match.clubTimeZone)}`
        : ""
      : displayStatus === "UPCOMING"
        ? formatTime(match.scheduledStart, match.clubTimeZone)
        : "";

  function handleStart() {
    setMenuOpen(false);
    startTransition(async () => {
      const result = await startMatchAction(match.tournamentId, match.id);
      if (!result.error) onUpdate({ status: "IN_PROGRESS", actualStart: new Date().toISOString() });
    });
  }

  function handlePause() {
    setMenuOpen(false);
    startTransition(async () => {
      const result = await pauseMatchAction(match.tournamentId, match.id);
      if (!result.error) onUpdate({ isPaused: true });
    });
  }

  function handleResume() {
    setMenuOpen(false);
    startTransition(async () => {
      const result = await resumeMatchAction(match.tournamentId, match.id);
      if (!result.error) onUpdate({ isPaused: false });
    });
  }

  function handleCancel() {
    setMenuOpen(false);
    startTransition(async () => {
      const result = await cancelMatchAction(match.tournamentId, match.id);
      if (!result.error) onUpdate({ status: "CANCELLED" });
    });
  }

  function handleCourtChange(value: string) {
    const newCourtId = value || null;
    setChangingCourt(false);
    onUpdate({ courtId: newCourtId, courtName: courts.find((c) => c.id === newCourtId)?.name ?? null });
    startTransition(async () => {
      await setMatchCourtAction(match.tournamentId, match.id, newCourtId);
    });
  }

  return (
    <div className={cn("flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-3.5 shadow-sm transition-opacity", CARD_TREATMENT[displayStatus])}>
      <span className="truncate text-[10.5px] text-muted-foreground">
        {showTournamentName ? `${match.tournamentName} · ` : ""}
        {match.categoryName}
        {match.groupName ? ` · ${match.groupName}` : ""} · {match.phaseLabel}
      </span>

      <div className="flex items-center gap-1.5">
        <span className="text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground">{match.courtName ?? ""}</span>
        <Badge tone={meta.tone} className="gap-1.5 px-2 py-0.5 text-[10px]">
          {meta.pulse && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
          {meta.label}
        </Badge>
        <span className="ml-auto text-[10.5px] tabular-nums text-muted-foreground">{timeText}</span>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-secondary hover:text-foreground"
            aria-label="Más acciones"
          >
            <DotsThreeVertical className="size-4" weight="bold" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-20 flex min-w-[168px] flex-col gap-0.5 rounded-md border border-border bg-surface p-1.5 shadow-lg">
              {displayStatus === "LIVE" && (
                <MenuButton icon={Pause} onClick={handlePause}>
                  Pausar partido
                </MenuButton>
              )}
              {displayStatus === "PAUSED" && (
                <MenuButton icon={Play} onClick={handleResume}>
                  Reanudar partido
                </MenuButton>
              )}
              {courts.length > 0 && (
                <MenuButton icon={MapPin} onClick={() => setChangingCourt(true)}>
                  Cambiar pista
                </MenuButton>
              )}
              {displayStatus !== "CANCELLED" && displayStatus !== "DONE" && (
                <MenuButton icon={Prohibit} onClick={handleCancel} destructive>
                  Cancelar partido
                </MenuButton>
              )}
            </div>
          )}
        </div>
      </div>

      {changingCourt && (
        <Select
          autoFocus
          value={match.courtId ?? ""}
          onChange={(e) => handleCourtChange(e.target.value)}
          onBlur={() => setChangingCourt(false)}
          disabled={isPending}
          className="h-8 text-xs"
        >
          <option value="">Sin pista</option>
          {courts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      )}

      <MatchScoreboard
        tournamentId={match.tournamentId}
        matchId={match.id}
        teamA={match.teamA}
        teamB={match.teamB}
        scoringConfig={match.scoringConfig}
        editable={editable}
        initialSets={match.sets}
        onConfirmed={onConfirmed}
      />

      {displayStatus === "UPCOMING" && (
        <Button type="button" size="sm" loading={isPending} onClick={handleStart} className="justify-center gap-1.5">
          <Play className="size-3.5" weight="fill" />
          Iniciar partido
        </Button>
      )}
    </div>
  );
}

function MenuButton({
  icon: Icon,
  onClick,
  destructive,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12.5px] transition-colors hover:bg-surface-secondary",
        destructive ? "text-destructive" : "text-foreground"
      )}
    >
      <Icon className="size-3.5 text-muted-foreground" />
      {children}
    </button>
  );
}
