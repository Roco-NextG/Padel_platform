"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CaretLeft, CaretRight, FilePdf, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { zonedDateKey, zonedSlotToIso, zonedTimeKey, shiftZonedDateKey, todayZonedDateKey } from "@/lib/timezone";
import { scheduleMatchAction, unscheduleMatchAction } from "../application/matchActions";
import { matchTeamLabel, type MatchListItem } from "../domain/match";

/**
 * Bloques posicionados por píxeles según la duración real del partido — no
 * celdas de grilla fijas — inspirado en el calendario semanal de Teach AI
 * (otro proyecto propio: ~/Desktop/Teach AI/teach-ai/src/components/
 * calendar/calendar-view.tsx). Ahí cada sesión es un <div> absoluto con
 * top/height calculados en base a su hora y duración reales, arrastrado con
 * HTML5 drag-and-drop nativo sobre una columna por día. Acá es la misma
 * idea con pistas en vez de días: resuelve de raíz el problema que tenía la
 * versión anterior (celda por bloque de 15min + "fraction" para simular
 * duraciones que no caían justo en el borde) — ahora el bloque simplemente
 * mide lo que dura, en vez de aproximarlo.
 */

const START_HOUR = 8;
const END_HOUR = 24; // exclusivo — el día termina a las 23:45
const HOUR_HEIGHT = 112; // px por hora — alcanza para categoría + ambas parejas + horario sin recortar en un partido de 30min+
const PX_PER_MIN = HOUR_HEIGHT / 60;
const GRID_MINUTES = 15; // granularidad del snap al soltar y de las líneas de fondo — independiente de la duración del torneo
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;
const COLUMN_MIN_WIDTH = 190; // suficiente para un nombre de pareja típico sin truncar — ver pedido explícito de que ambas parejas se vean completas
const HOUR_COL_WIDTH = 52;

const LOCKED_STATUSES = new Set<MatchListItem["status"]>(["IN_PROGRESS", "PENDING_CONFIRMATION", "CONFIRMED", "DISPUTED", "CANCELLED"]);

function buildGridSlots(): string[] {
  const slots: string[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    for (let m = 0; m < 60; m += GRID_MINUTES) slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
}
const GRID_SLOTS = buildGridSlots();

/** "08:45" → 45 (minutos desde START_HOUR). Negativo o > TOTAL si cae fuera del rango mostrado. */
function timeKeyToMinutesFromStart(timeKey: string): number {
  const [h, m] = timeKey.split(":").map(Number);
  return (h - START_HOUR) * 60 + m;
}

function minutesFromStartToTimeKey(minutes: number): string {
  const clamped = Math.max(0, Math.min(minutes, (END_HOUR - START_HOUR) * 60 - GRID_MINUTES));
  const hour = START_HOUR + Math.floor(clamped / 60);
  const min = clamped % 60;
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** "08:00–08:45" — null si todavía no tiene horario confirmado (partido sin agendar). */
function matchTimeRangeLabel(match: MatchListItem, timeZone: string): string | null {
  if (!match.scheduledStart || !match.scheduledEnd) return null;
  return `${zonedTimeKey(match.scheduledStart, timeZone)}–${zonedTimeKey(match.scheduledEnd, timeZone)}`;
}

function PoolMatchCard({ match, onDragStart }: { match: MatchListItem; onDragStart: (e: React.DragEvent) => void }) {
  const draggable = !LOCKED_STATUSES.has(match.status);
  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      className={cn(
        "flex flex-col gap-0.5 rounded-md border border-border bg-surface px-2.5 py-2 shadow-sm",
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-default opacity-70"
      )}
    >
      <span className="text-[9px] font-bold uppercase tracking-wide text-accent-text">{match.categoryName}</span>
      <span className="text-[10.5px] font-medium leading-snug text-foreground">{matchTeamLabel(match.teamA)}</span>
      <span className="text-[8.5px] font-semibold uppercase tracking-wide text-muted-foreground">vs</span>
      <span className="text-[10.5px] font-medium leading-snug text-foreground">{matchTeamLabel(match.teamB)}</span>
    </div>
  );
}

function ScheduledMatchBlock({
  match,
  top,
  height,
  timeRange,
  isDragging,
  onDragStart,
  onDragEnd,
  onUnschedule,
}: {
  match: MatchListItem;
  top: number;
  height: number;
  timeRange: string | null;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onUnschedule: () => void;
}) {
  const draggable = !LOCKED_STATUSES.has(match.status);
  // Umbrales de alto disponible — igual criterio que cualquier calendario
  // real (Google Calendar incluido): un bloque de 15-20min no tiene lugar
  // para 4 líneas de texto, así que se recorta en vez de desbordar.
  const tiny = height < 32;
  const compact = height < 58;

  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      onDragEnd={onDragEnd}
      style={{ top, height: Math.max(height, 18) }}
      className={cn(
        "group absolute left-[3px] right-[3px] overflow-hidden rounded-md border border-accent-strong/40 bg-accent-muted px-2 py-1 shadow-sm transition-opacity",
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-default opacity-80",
        isDragging && "opacity-30"
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={cn("font-bold uppercase tracking-wide text-accent-text", tiny ? "text-[7.5px]" : "text-[9px]")}>
          {match.categoryName}
        </span>
        {timeRange && !tiny && (
          <span className="shrink-0 text-[8.5px] font-semibold tabular-nums text-accent-text/70">{timeRange}</span>
        )}
      </div>
      {tiny ? (
        timeRange && <span className="block truncate text-[9px] font-semibold tabular-nums text-accent-text">{timeRange}</span>
      ) : (
        <>
          {/* compact trunca (poco alto disponible); con más alto se deja hacer wrap en vez de cortar el nombre — pedido explícito de que ambas parejas se vean completas. */}
          <span className={cn("text-[10.5px] font-medium leading-snug text-foreground", compact ? "block truncate" : "block")}>
            {matchTeamLabel(match.teamA)}
          </span>
          {!compact && <span className="block text-[8.5px] font-semibold uppercase tracking-wide text-accent-text/60">vs</span>}
          <span className={cn("text-[10.5px] font-medium leading-snug text-foreground", compact ? "block truncate" : "block")}>
            {matchTeamLabel(match.teamB)}
          </span>
        </>
      )}
      {draggable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUnschedule();
          }}
          className="absolute right-0.5 top-0.5 rounded bg-surface/80 p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
          aria-label="Quitar del calendario"
        >
          <X className="size-3" weight="bold" />
        </button>
      )}
    </div>
  );
}

/** Líneas de fondo cada GRID_MINUTES — puramente decorativas (pointer-events-none), el drop se resuelve por posición del puntero en la columna, no celda por celda. */
function BackgroundGrid() {
  return (
    <>
      {GRID_SLOTS.map((time) => (
        <div
          key={time}
          style={{ top: timeKeyToMinutesFromStart(time) * PX_PER_MIN, height: GRID_MINUTES * PX_PER_MIN }}
          className={cn(
            "pointer-events-none absolute inset-x-0 border-b",
            time.endsWith(":00") ? "border-border-strong" : time.endsWith(":30") ? "border-border" : "border-dashed border-border/50"
          )}
        />
      ))}
    </>
  );
}

function CourtColumn({
  court,
  matches,
  clubTimeZone,
  draggingId,
  dragOverMinutes,
  matchDurationMinutes,
  onMatchDragStart,
  onMatchDragEnd,
  onUnschedule,
  onColumnDragOver,
  onColumnDrop,
}: {
  court: { id: string; name: string };
  matches: MatchListItem[];
  clubTimeZone: string;
  draggingId: string | null;
  dragOverMinutes: number | null;
  matchDurationMinutes: number;
  onMatchDragStart: (e: React.DragEvent, matchId: string) => void;
  onMatchDragEnd: () => void;
  onUnschedule: (matchId: string) => void;
  onColumnDragOver: (e: React.DragEvent, courtId: string) => void;
  onColumnDrop: (e: React.DragEvent, courtId: string) => void;
}) {
  return (
    <div
      className="relative border-l border-border"
      style={{ height: TOTAL_HEIGHT }}
      onDragOver={(e) => onColumnDragOver(e, court.id)}
      onDrop={(e) => onColumnDrop(e, court.id)}
    >
      <BackgroundGrid />

      {dragOverMinutes !== null && (
        <div
          style={{ top: dragOverMinutes * PX_PER_MIN, height: Math.max(matchDurationMinutes * PX_PER_MIN, 18) }}
          className="pointer-events-none absolute left-[3px] right-[3px] rounded-md border-2 border-dashed border-accent-strong bg-accent-muted/60"
        />
      )}

      {matches.map((m) => {
        const top = timeKeyToMinutesFromStart(zonedTimeKey(m.scheduledStart!, clubTimeZone)) * PX_PER_MIN;
        const durationMin = (new Date(m.scheduledEnd!).getTime() - new Date(m.scheduledStart!).getTime()) / 60_000;
        return (
          <ScheduledMatchBlock
            key={m.id}
            match={m}
            top={top}
            height={durationMin * PX_PER_MIN}
            timeRange={matchTimeRangeLabel(m, clubTimeZone)}
            isDragging={draggingId === m.id}
            onDragStart={(e) => onMatchDragStart(e, m.id)}
            onDragEnd={onMatchDragEnd}
            onUnschedule={() => onUnschedule(m.id)}
          />
        );
      })}
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

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCourtId, setDragOverCourtId] = useState<string | null>(null);
  const [dragOverMinutes, setDragOverMinutes] = useState<number | null>(null);
  const dragMatchIdRef = useRef<string | null>(null);

  const [nowMinutes, setNowMinutes] = useState<number | null>(null);
  useEffect(() => {
    function update() {
      const mins = timeKeyToMinutesFromStart(zonedTimeKey(new Date().toISOString(), clubTimeZone));
      setNowMinutes(mins >= 0 && mins <= (END_HOUR - START_HOUR) * 60 ? mins : null);
    }
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [clubTimeZone]);

  const categories = useMemo(() => ["Todas", ...new Set(matches.map((m) => m.categoryName))], [matches]);

  const pool = useMemo(
    () => matches.filter((m) => m.status === "SCHEDULED" && !m.scheduledStart && (categoryFilter === "Todas" || m.categoryName === categoryFilter)),
    [matches, categoryFilter]
  );

  const scheduledByCourtId = useMemo(() => {
    const map = new Map<string, MatchListItem[]>();
    for (const m of matches) {
      if (!m.scheduledStart || !m.scheduledEnd || !m.courtId) continue;
      if (categoryFilter !== "Todas" && m.categoryName !== categoryFilter) continue;
      if (zonedDateKey(m.scheduledStart, clubTimeZone) !== selectedDate) continue;
      const list = map.get(m.courtId) ?? [];
      list.push(m);
      map.set(m.courtId, list);
    }
    return map;
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

  function commitSchedule(matchId: string, courtId: string, time: string) {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

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

  function handleMatchDragStart(e: React.DragEvent, matchId: string) {
    dragMatchIdRef.current = matchId;
    setDraggingId(matchId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", matchId);
  }

  function handleMatchDragEnd() {
    setDraggingId(null);
    setDragOverCourtId(null);
    setDragOverMinutes(null);
    dragMatchIdRef.current = null;
  }

  function minutesFromPointer(e: React.DragEvent): number {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const raw = y / PX_PER_MIN;
    return Math.round(raw / GRID_MINUTES) * GRID_MINUTES;
  }

  function handleColumnDragOver(e: React.DragEvent, courtId: string) {
    if (!dragMatchIdRef.current) return;
    e.preventDefault();
    setDragOverCourtId(courtId);
    setDragOverMinutes(minutesFromPointer(e));
  }

  function handleColumnDrop(e: React.DragEvent, courtId: string) {
    e.preventDefault();
    const matchId = dragMatchIdRef.current;
    setDragOverCourtId(null);
    setDragOverMinutes(null);
    if (!matchId) return;
    const time = minutesFromStartToTimeKey(minutesFromPointer(e));
    commitSchedule(matchId, courtId, time);
  }

  function handlePoolDragOver(e: React.DragEvent) {
    if (dragMatchIdRef.current) e.preventDefault();
  }

  function handlePoolDrop(e: React.DragEvent) {
    e.preventDefault();
    const matchId = dragMatchIdRef.current;
    if (!matchId) return;
    const match = matches.find((m) => m.id === matchId);
    if (match?.scheduledStart) handleUnschedule(matchId);
  }

  const isToday = selectedDate === todayZonedDateKey(clubTimeZone);
  const gridMinWidth = Math.max(860, HOUR_COL_WIDTH + courts.length * COLUMN_MIN_WIDTH);

  return (
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
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3.5 shadow-sm">
            <div>
              <h3 className="text-xs font-semibold text-foreground">Partidos sin programar</h3>
              <p className="text-[11px] text-muted-foreground">
                {pool.length} partido{pool.length === 1 ? "" : "s"}
              </p>
            </div>
            <div
              onDragOver={handlePoolDragOver}
              onDrop={handlePoolDrop}
              className={cn(
                "flex max-h-[560px] min-h-20 flex-col gap-2 overflow-y-auto rounded-md p-0.5 transition-colors",
                draggingId && "bg-accent-muted/40"
              )}
            >
              {pool.length === 0 ? (
                <div className="rounded-md border border-dashed border-border-strong px-3 py-4 text-center text-[11px] text-muted-foreground">
                  Sin partidos pendientes en esta categoría
                </div>
              ) : (
                pool.map((m) => <PoolMatchCard key={m.id} match={m} onDragStart={(e) => handleMatchDragStart(e, m.id)} />)
              )}
            </div>
          </div>

          <div className="overflow-auto rounded-lg border border-border bg-background">
            <div className="grid" style={{ gridTemplateColumns: `${HOUR_COL_WIDTH}px repeat(${courts.length}, minmax(${COLUMN_MIN_WIDTH}px, 1fr))`, minWidth: gridMinWidth }}>
              <div className="sticky left-0 top-0 z-[3] bg-background" />
              {courts.map((c) => (
                <div key={c.id} className="sticky top-0 z-[2] border-l border-border bg-background px-1 py-2 text-center text-[10.5px] font-semibold text-muted-foreground">
                  {c.name}
                </div>
              ))}

              <div className="sticky left-0 z-[1] bg-background">
                <div className="relative" style={{ height: TOTAL_HEIGHT }}>
                  {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i).map((hour) => (
                    <div
                      key={hour}
                      style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                      className="absolute inset-x-0 flex items-start justify-end px-2 pt-0.5 text-[10.5px] font-semibold text-foreground"
                    >
                      {String(hour).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>
              </div>
              {courts.map((c) => (
                <CourtColumn
                  key={c.id}
                  court={c}
                  matches={scheduledByCourtId.get(c.id) ?? []}
                  clubTimeZone={clubTimeZone}
                  draggingId={draggingId}
                  dragOverMinutes={dragOverCourtId === c.id ? dragOverMinutes : null}
                  matchDurationMinutes={matchDurationMinutes}
                  onMatchDragStart={handleMatchDragStart}
                  onMatchDragEnd={handleMatchDragEnd}
                  onUnschedule={handleUnschedule}
                  onColumnDragOver={handleColumnDragOver}
                  onColumnDrop={handleColumnDrop}
                />
              ))}

              {isToday && nowMinutes !== null && (
                <div className="pointer-events-none relative" style={{ gridColumn: "1 / -1", gridRow: "2", height: 0 }}>
                  <div style={{ top: nowMinutes * PX_PER_MIN, left: HOUR_COL_WIDTH }} className="absolute right-0 z-[4] flex items-center">
                    <div className="-ml-1 size-2 shrink-0 rounded-full bg-destructive" />
                    <div className="h-px flex-1 bg-destructive/70" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
