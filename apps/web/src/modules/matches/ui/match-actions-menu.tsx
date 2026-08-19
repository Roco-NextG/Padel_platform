"use client";

import { useState, useTransition } from "react";
import { DotsThreeVertical, Pause, Play, Prohibit, MapPin, CaretLeft, Check } from "@phosphor-icons/react";
import { canTransition } from "@padel-platform/match-engine";
import type { MatchStatus } from "@padel-platform/match-engine";
import { cn } from "@/lib/utils";
import {
  cancelMatchAction,
  changeMatchCourtAction,
  pauseMatchAction,
  resumeMatchAction,
} from "../application/actions";
import type { CourtOption } from "../infrastructure/matchRepository";

function MenuItem({
  onClick,
  disabled,
  destructive,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
        disabled
          ? "cursor-not-allowed text-foreground-tertiary"
          : destructive
            ? "text-destructive hover:bg-destructive-muted"
            : "text-foreground hover:bg-surface-secondary"
      )}
    >
      {children}
    </button>
  );
}

/**
 * Menú ••• del partido — Pausar/Reanudar/Cancelar/Cambiar pista (redesign/partidos-vivo
 * §4). Pausar/Reanudar tocan solo matches.is_paused (0023_match_pause.sql,
 * booleano sobre IN_PROGRESS, decidido con el usuario). Cancelar usa
 * canTransition() del Match Engine sin modificarlo — mismas reglas que ya
 * rige el resto de la app. Cambiar pista queda deshabilitado por partido si
 * su club no tiene pistas cargadas (courts.length === 0), no por falta de UI:
 * la tabla courts es real y ya se lee directo, sin depender de Planificación.
 */
export function MatchActionsMenu({
  matchId,
  status,
  isPaused,
  courtId,
  courts,
}: {
  matchId: string;
  status: string;
  isPaused: boolean;
  courtId: string | null;
  courts: CourtOption[];
}) {
  const [open, setOpen] = useState(false);
  const [pickingCourt, setPickingCourt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setPickingCourt(false);
  }

  function run(action: () => Promise<{ error: string | null }>) {
    close();
    startTransition(async () => {
      const result = await action();
      setError(result.error);
    });
  }

  const canPause = status === "IN_PROGRESS" && !isPaused;
  const canResume = status === "IN_PROGRESS" && isPaused;
  const canCancel = canTransition(status as MatchStatus, "CANCELLED");

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Más acciones"
        disabled={isPending}
        onClick={() => setOpen((o) => !o)}
        className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-secondary hover:text-foreground disabled:opacity-50"
      >
        <DotsThreeVertical className="size-4" weight="bold" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-border bg-surface p-1 shadow-md">
            {!pickingCourt ? (
              <>
                {canPause && (
                  <MenuItem onClick={() => run(() => pauseMatchAction(matchId))}>
                    <Pause className="size-3.5" /> Pausar partido
                  </MenuItem>
                )}
                {canResume && (
                  <MenuItem onClick={() => run(() => resumeMatchAction(matchId))}>
                    <Play className="size-3.5" /> Reanudar partido
                  </MenuItem>
                )}
                <MenuItem disabled={courts.length === 0} onClick={() => setPickingCourt(true)}>
                  <MapPin className="size-3.5" />
                  Cambiar pista{courts.length === 0 ? " (sin pistas)" : ""}
                </MenuItem>
                {canCancel && (
                  <MenuItem destructive onClick={() => run(() => cancelMatchAction(matchId))}>
                    <Prohibit className="size-3.5" /> Cancelar partido
                  </MenuItem>
                )}
              </>
            ) : (
              <>
                <MenuItem onClick={() => setPickingCourt(false)}>
                  <CaretLeft className="size-3.5" /> Volver
                </MenuItem>
                {courts.map((c) => (
                  <MenuItem key={c.id} onClick={() => run(() => changeMatchCourtAction(matchId, c.id))}>
                    {c.id === courtId && <Check className="size-3.5" />}
                    {c.name}
                  </MenuItem>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {error && (
        <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-destructive bg-destructive-muted px-2.5 py-1.5 text-xs text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
