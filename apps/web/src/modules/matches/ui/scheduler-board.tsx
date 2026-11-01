"use client";

import { useMemo, useState, useTransition } from "react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CaretLeft, CaretRight, FilePdf, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { zonedDateKey, zonedSlotToIso, zonedTimeKey, shiftZonedDateKey } from "@/lib/timezone";
import { scheduleMatchAction, unscheduleMatchAction } from "../application/matchActions";
import { matchTeamLabel, type MatchListItem } from "../domain/match";

const START_HOUR = 8;
const END_HOUR = 24; // exclusivo — el último slot es 23:45
const POOL_DROPPABLE_ID = "pool";
/** Cada cuánto se puede arrancar un partido — independiente de la duración del torneo, para que una duración que no sea múltiplo de 30 (45min, por ejemplo) no deje minutos muertos sin poder agendarse en la pista. */
const SLOT_MINUTES = 15;

function buildTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}
const TIME_SLOTS = buildTimeSlots();

const LOCKED_STATUSES = new Set<MatchListItem["status"]>(["IN_PROGRESS", "PENDING_CONFIRMATION", "CONFIRMED", "DISPUTED", "CANCELLED"]);

/** "08:00–08:45" — null si todavía no tiene horario confirmado (partido sin agendar). */
function matchTimeRangeLabel(match: MatchListItem, timeZone: string): string | null {
  if (!match.scheduledStart || !match.scheduledEnd) return null;
  return `${zonedTimeKey(match.scheduledStart, timeZone)}–${zonedTimeKey(match.scheduledEnd, timeZone)}`;
}

function MatchChip({ match, placed, timeRange }: { match: MatchListItem; placed: boolean; timeRange?: string | null }) {
  const draggable = !LOCKED_STATUSES.has(match.status);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: match.id,
    disabled: !draggable,
  });

  return (
    <div
      ref={setNodeRef}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      style={transform ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 50 : undefined } : undefined}
      className={cn(
        "flex flex-col gap-0.5 rounded-md border border-border bg-surface px-2.5 py-2 shadow-sm transition-opacity",
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-default opacity-70",
        isDragging && "opacity-30",
        placed && "h-full"
      )}
    >
      <div className="flex items-start justify-between gap-1.5">
        <span className="text-[9px] font-bold uppercase tracking-wide text-accent-text">{match.categoryName}</span>
        {/* Confirma a simple vista la hora de inicio y fin real — necesario sobre todo cuando la duración del torneo no cae en :00/:30 (ej. 45min), donde la celda sola no alcanza a mostrarlo. */}
        {timeRange && <span className="shrink-0 text-[8.5px] font-semibold tabular-nums text-muted-foreground">{timeRange}</span>}
      </div>
      <span className="text-[10.5px] font-medium leading-snug text-foreground">{matchTeamLabel(match.teamA)}</span>
      <span className="text-[8.5px] font-semibold uppercase tracking-wide text-muted-foreground">vs</span>
      <span className="text-[10.5px] font-medium leading-snug text-foreground">{matchTeamLabel(match.teamB)}</span>
    </div>
  );
}

function SlotCell({
  courtId,
  time,
  match,
  blockedBy,
  clubTimeZone,
  onUnschedule,
}: {
  courtId: string;
  time: string;
  match: MatchListItem | undefined;
  /** Set cuando esta celda cae DENTRO de la duración de un partido agendado en un slot anterior (no es su inicio) — bloqueada para soltar otro partido, sin chip propio. `fraction` es qué porción de este bloque de 30min ocupa de verdad (1 = todo, <1 cuando la duración no es múltiplo de 30 — ej. 45min deja la mitad del segundo bloque libre). */
  blockedBy: { match: MatchListItem; fraction: number } | undefined;
  clubTimeZone: string;
  onUnschedule: (matchId: string) => void;
}) {
  // "|" como separador, no ":" — `time` ya trae un ":" propio ("08:45"), así
  // que separar por ":" partía mal el id (ver handleDragEnd) y cualquier
  // horario que no fuera HH:00 se reagendaba silenciosamente en HH:00.
  const { setNodeRef, isOver } = useDroppable({ id: `cell|${courtId}|${time}`, disabled: !!blockedBy });
  const removable = match && !LOCKED_STATUSES.has(match.status);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative min-h-11 border border-border bg-surface-secondary p-0.5 transition-colors",
        isOver && !match && "bg-accent-muted shadow-[inset_0_0_0_2px_var(--accent-strong)]",
        isOver && match && "bg-destructive-muted shadow-[inset_0_0_0_2px_var(--destructive)]",
        match && "bg-surface"
      )}
    >
      {blockedBy && (
        <div
          className="absolute inset-x-0 top-0 bg-[repeating-linear-gradient(135deg,var(--border)_0px,var(--border)_4px,transparent_4px,transparent_9px)]"
          style={{ height: `${blockedBy.fraction * 100}%` }}
        />
      )}
      {match && (
        <div className="group relative h-full">
          <MatchChip match={match} placed timeRange={matchTimeRangeLabel(match, clubTimeZone)} />
          {removable && (
            <button
              type="button"
              onClick={() => onUnschedule(match.id)}
              className="absolute right-0.5 top-0.5 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              aria-label="Quitar del calendario"
            >
              <X className="size-3" weight="bold" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Pool({ matches }: { matches: MatchListItem[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: POOL_DROPPABLE_ID });
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3.5 shadow-sm">
      <div>
        <h3 className="text-xs font-semibold text-foreground">Partidos sin programar</h3>
        <p className="text-[11px] text-muted-foreground">
          {matches.length} partido{matches.length === 1 ? "" : "s"}
        </p>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex max-h-[560px] min-h-20 flex-col gap-2 overflow-y-auto rounded-md p-0.5 transition-colors",
          isOver && "bg-accent-muted"
        )}
      >
        {matches.length === 0 ? (
          <div className="rounded-md border border-dashed border-border-strong px-3 py-4 text-center text-[11px] text-muted-foreground">
            Sin partidos pendientes en esta categoría
          </div>
        ) : (
          matches.map((m) => <MatchChip key={m.id} match={m} placed={false} />)
        )}
      </div>
    </div>
  );
}

export function SchedulerBoard({
  tournamentId,
  matches: initialMatches,
  courts,
  initialDate,
  clubTimeZone,
  matchDurationMinutes,
}: {
  tournamentId: string;
  matches: MatchListItem[];
  courts: { id: string; name: string }[];
  initialDate: string;
  clubTimeZone: string;
  /** Configurado por torneo (Datos del asistente) — usado acá solo para el chequeo optimista en el cliente; scheduleMatchAction recalcula lo mismo en el servidor, fuente de verdad real. */
  matchDurationMinutes: number;
}) {
  const [matches, setMatches] = useState(initialMatches);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [categoryFilter, setCategoryFilter] = useState<string>("Todas");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const categories = useMemo(() => ["Todas", ...new Set(matches.map((m) => m.categoryName))], [matches]);

  const pool = useMemo(
    () => matches.filter((m) => m.status === "SCHEDULED" && !m.scheduledStart && (categoryFilter === "Todas" || m.categoryName === categoryFilter)),
    [matches, categoryFilter]
  );

  // blockedCells: celdas posteriores a la de inicio que caen dentro de la
  // duración REAL del partido (scheduledStart→scheduledEnd ya guardados en
  // BD), no un valor fijo acá — así un partido agendado con una duración
  // vieja (90 min, antes de este cambio) sigue bloqueando visualmente lo que
  // de verdad tiene reservado, y uno nuevo de 45 min bloquea exactamente los
  // bloques de 15 min que le corresponden (ver SLOT_MINUTES).
  const { placedByCell, blockedCells } = useMemo(() => {
    const placed = new Map<string, MatchListItem>();
    const blocked = new Map<string, { match: MatchListItem; fraction: number }>();
    const SLOT_MS = SLOT_MINUTES * 60_000;
    for (const m of matches) {
      if (!m.scheduledStart || !m.courtId) continue;
      if (categoryFilter !== "Todas" && m.categoryName !== categoryFilter) continue;
      if (zonedDateKey(m.scheduledStart, clubTimeZone) !== selectedDate) continue;
      placed.set(`${m.courtId}:${zonedTimeKey(m.scheduledStart, clubTimeZone)}`, m);
      if (!m.scheduledEnd) continue;
      const startMs = new Date(m.scheduledStart).getTime();
      const endMs = new Date(m.scheduledEnd).getTime();
      // La última celda puede quedar solo parcialmente ocupada cuando la
      // duración no es múltiplo de SLOT_MINUTES (ej. 50min con slots de
      // 15min deja un resto de 5min) — `fraction` es lo que de verdad
      // tiene reservado ese bloque, para no pintarlo como ocupado del todo.
      for (let t = startMs + SLOT_MS; t < endMs; t += SLOT_MS) {
        const fraction = Math.min(1, (Math.min(endMs, t + SLOT_MS) - t) / SLOT_MS);
        blocked.set(`${m.courtId}:${zonedTimeKey(new Date(t).toISOString(), clubTimeZone)}`, { match: m, fraction });
      }
    }
    return { placedByCell: placed, blockedCells: blocked };
  }, [matches, selectedDate, categoryFilter, clubTimeZone]);

  function applyScheduleUpdate(matchId: string, courtId: string | null, scheduledStart: string | null, scheduledEnd: string | null) {
    setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, courtId, scheduledStart, scheduledEnd } : m)));
  }

  function handleUnschedule(matchId: string) {
    const previous = matches.find((m) => m.id === matchId);
    if (!previous) return;
    setError(null);
    applyScheduleUpdate(matchId, null, null, null);
    startTransition(async () => {
      const result = await unscheduleMatchAction(tournamentId, matchId);
      if (result.error) {
        applyScheduleUpdate(matchId, previous.courtId, previous.scheduledStart, previous.scheduledEnd);
        setError(result.error);
      }
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const matchId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId) return;

    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    if (overId === POOL_DROPPABLE_ID) {
      if (match.scheduledStart) handleUnschedule(matchId);
      return;
    }

    const [, courtId, time] = overId.split("|");
    if (!courtId || !time) return;

    const scheduledStartIso = zonedSlotToIso(selectedDate, time, clubTimeZone);
    const scheduledEnd = new Date(new Date(scheduledStartIso).getTime() + matchDurationMinutes * 60_000).toISOString();
    const conflict = matches.some(
      (m) =>
        m.id !== matchId &&
        m.courtId === courtId &&
        m.status !== "CANCELLED" &&
        m.scheduledStart &&
        m.scheduledEnd &&
        m.scheduledStart < scheduledEnd &&
        m.scheduledEnd > scheduledStartIso
    );
    if (conflict) {
      setError("Esa pista ya tiene un partido programado en ese horario.");
      return;
    }

    const previous = { courtId: match.courtId, scheduledStart: match.scheduledStart, scheduledEnd: match.scheduledEnd };
    setError(null);
    applyScheduleUpdate(matchId, courtId, scheduledStartIso, scheduledEnd);
    startTransition(async () => {
      const result = await scheduleMatchAction(tournamentId, matchId, courtId, scheduledStartIso);
      if (result.error) {
        applyScheduleUpdate(matchId, previous.courtId, previous.scheduledStart, previous.scheduledEnd);
        setError(result.error);
      }
    });
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => shiftZonedDateKey(d, -1))}
              className="flex size-8 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:bg-surface-secondary"
              aria-label="Día anterior"
            >
              <CaretLeft className="size-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 rounded-md border border-border-strong bg-surface px-2.5 text-sm text-foreground"
            />
            <button
              type="button"
              onClick={() => setSelectedDate((d) => shiftZonedDateKey(d, 1))}
              className="flex size-8 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:bg-surface-secondary"
              aria-label="Día siguiente"
            >
              <CaretRight className="size-4" />
            </button>
          </div>
          <a
            href={`/imprimir/partidos?torneo=${tournamentId}&fecha=${selectedDate}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-secondary"
          >
            <FilePdf className="size-4" />
            Descargar PDF del día
          </a>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoryFilter(c)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  categoryFilter === c
                    ? "border-accent bg-accent-muted text-accent-text"
                    : "border-border-strong text-muted-foreground hover:bg-surface-secondary"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {courts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este club no tiene pistas disponibles configuradas.</p>
        ) : (
          <div className="grid grid-cols-[230px_1fr] items-start gap-4 max-[860px]:grid-cols-1">
            <Pool matches={pool} />

            <div className="overflow-auto rounded-lg border border-border bg-background">
              <div
                className="grid gap-px bg-border"
                style={{ gridTemplateColumns: `58px repeat(${courts.length}, minmax(136px, 1fr))`, minWidth: 960 }}
              >
                <div className="sticky left-0 top-0 z-[3] bg-background" />
                {courts.map((c) => (
                  <div key={c.id} className="sticky top-0 z-[2] bg-background px-1 py-2 text-center text-[10.5px] font-semibold text-muted-foreground">
                    {c.name}
                  </div>
                ))}
                {TIME_SLOTS.map((time) => (
                  <div key={time} className="contents">
                    <div
                      className={cn(
                        "sticky left-0 z-[1] flex items-center justify-end bg-background px-2 text-[10px] font-medium text-foreground-tertiary",
                        time.endsWith(":00") && "text-[10.5px] font-semibold text-foreground",
                        time.endsWith(":30") && "text-muted-foreground"
                      )}
                    >
                      {time}
                    </div>
                    {courts.map((c) => (
                      <SlotCell
                        key={c.id}
                        courtId={c.id}
                        time={time}
                        match={placedByCell.get(`${c.id}:${time}`)}
                        blockedBy={blockedCells.get(`${c.id}:${time}`)}
                        clubTimeZone={clubTimeZone}
                        onUnschedule={handleUnschedule}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}
