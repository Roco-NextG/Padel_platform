import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarBlank, MapPin, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { requireTournamentManager } from "@/modules/tournaments/application/authGuard";
import { getTournament } from "@/modules/tournaments/application/getTournaments";
import { fetchMatchesForTournament } from "@/modules/matches/infrastructure/matchRepository";
import { fetchClubCourts } from "@/modules/courts/infrastructure/courtRepository";
import { matchTeamLabel, type MatchListItem } from "@/modules/matches/domain/match";
import { formatZonedDate, zonedDateKey, zonedSlotToIso, zonedTimeKey, todayZonedDateKey } from "@/lib/timezone";
import { EmptyState } from "@/components/ui/empty-state";
import { PrintButton } from "@/modules/matches/ui/print-button";
import { DeuceUpWordmark } from "@/components/brand/deuceup-wordmark";

export const metadata: Metadata = { title: "Planificación del día — DeuceUp" };

/**
 * Bloques posicionados por porcentaje dentro de un contenedor de altura fija
 * — no una tabla con una fila por cada 15min (como era antes). Esa tabla
 * creció 4x al pasar el planificador a slots de 15min (0037): con un rango
 * horario largo y varias pistas se desbordaba a más de una hoja, y las
 * celdas fusionadas con rowSpan quedaban cortadas feo justo en el salto de
 * página. Acá la altura del área de la grilla está fijada a lo que entra en
 * una sola hoja (ver --grid-h más abajo); cada partido ocupa el porcentaje
 * exacto de esa altura que le corresponde según su hora real, así que
 * SIEMPRE entra entero en una página sin importar cuántos partidos haya —
 * se vuelve más compacto solo, en vez de desbordar. Mismo criterio que ya
 * usa el planificador en pantalla (scheduler-board.tsx), con porcentaje en
 * vez de píxeles porque acá el contenedor cambia de alto entre pantalla e
 * impresión.
 */
const PRINT_GRID_HEIGHT_MM = 124; // alto disponible para la grilla en la hoja impresa, después de cabecera y pie (A4 horizontal, 190mm útiles con margen de 10mm)
const SCREEN_GRID_HEIGHT_PX = 560;
const COURT_COL_MIN_PX = 150;

function timeKeyToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTimeKey(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Rango a mostrar — acotado al primer/último partido del día (redondeado al cuarto de hora), no las 24h del planificador: acá es para imprimir, no para arrastrar y soltar. */
function computeRange(matches: MatchListItem[], timeZone: string): { start: number; end: number } | null {
  if (matches.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const m of matches) {
    const startMinutes = timeKeyToMinutes(zonedTimeKey(m.scheduledStart!, timeZone));
    const endMinutes = timeKeyToMinutes(zonedTimeKey(m.scheduledEnd ?? m.scheduledStart!, timeZone));
    min = Math.min(min, startMinutes);
    max = Math.max(max, Math.max(endMinutes, startMinutes + 15));
  }
  return { start: Math.floor(min / 15) * 15, end: Math.ceil(max / 15) * 15 };
}

function buildHourMarks(range: { start: number; end: number }): { minutes: number; label: string; major: boolean }[] {
  const marks: { minutes: number; label: string; major: boolean }[] = [];
  const first = Math.ceil(range.start / 30) * 30;
  for (let t = first; t <= range.end; t += 30) marks.push({ minutes: t, label: minutesToTimeKey(t), major: t % 60 === 0 });
  return marks;
}

function percentInRange(minutes: number, range: { start: number; end: number }): number {
  return ((minutes - range.start) / (range.end - range.start)) * 100;
}

/** Decide cuánto detalle entra en la tarjeta según el alto aproximado que va a tener EN LA HOJA IMPRESA (el destino que manda) — si en pantalla sobra un poco más de aire, no pasa nada. */
function densityTier(durationMinutes: number, range: { start: number; end: number }): "full" | "compact" | "tiny" {
  const approxMm = (durationMinutes / (range.end - range.start)) * PRINT_GRID_HEIGHT_MM;
  if (approxMm < 7) return "tiny";
  if (approxMm < 13) return "compact";
  return "full";
}

/** "08:00–08:45" — null si el partido no tiene horario de fin confirmado. */
function matchTimeRangeLabel(match: MatchListItem, timeZone: string): string | null {
  if (!match.scheduledStart || !match.scheduledEnd) return null;
  return `${zonedTimeKey(match.scheduledStart, timeZone)}–${zonedTimeKey(match.scheduledEnd, timeZone)}`;
}

/**
 * Ruta fuera de (club) a propósito — sin el sidebar/header del panel, para
 * que "Guardar como PDF" (window.print) imprima solo la planificación, no
 * la app entera. Horizontal, con el calendario completo (todas las pistas,
 * todos los partidos del día) en una sola hoja — ambas parejas siempre
 * completas, nada truncado salvo cuando el partido es muy corto y
 * literalmente no entra el detalle (ver densityTier).
 *
 * La cabecera reusa el mismo lenguaje de marca que ya usan las cards de
 * torneo/liga (bg-inverse + glow radial en accent-muted, ver
 * tournament-card.tsx) en vez de inventar un tratamiento nuevo — es el
 * único otro lugar de la app donde el lime de cancha ocupa una región
 * grande, no un accent suelto. print-color-adjust: exact es lo que hace
 * que esos colores sobrevivan al "Guardar como PDF" — Chrome/Safari
 * descartan los fondos de color al imprimir si no se pide explícitamente.
 */
export default async function ImprimirPartidosPage({
  searchParams,
}: {
  searchParams: Promise<{ torneo?: string; fecha?: string }>;
}) {
  const { torneo, fecha } = await searchParams;
  if (!torneo) notFound();

  const auth = await requireTournamentManager(torneo);
  if (!auth.ok) notFound();

  const tournament = await getTournament(torneo);
  if (!tournament) notFound();

  const selectedDate = fecha ?? tournament.startDate ?? todayZonedDateKey(tournament.clubTimeZone);
  const dateLabelIso = zonedSlotToIso(selectedDate, "12:00", tournament.clubTimeZone);
  const weekday = formatZonedDate(dateLabelIso, { weekday: "long" }, tournament.clubTimeZone);
  const day = formatZonedDate(dateLabelIso, { day: "numeric" }, tournament.clubTimeZone);
  const month = formatZonedDate(dateLabelIso, { month: "short" }, tournament.clubTimeZone).replace(".", "");
  const year = formatZonedDate(dateLabelIso, { year: "numeric" }, tournament.clubTimeZone);

  const [allMatches, allCourts] = await Promise.all([fetchMatchesForTournament(torneo), fetchClubCourts(tournament.clubId)]);
  const courts = allCourts.filter((c) => c.status === "AVAILABLE");

  const dayMatches = allMatches.filter(
    (m) => m.scheduledStart && m.courtId && zonedDateKey(m.scheduledStart, tournament.clubTimeZone) === selectedDate
  );

  const range = computeRange(dayMatches, tournament.clubTimeZone);
  const hourMarks = range ? buildHourMarks(range) : [];
  const matchesByCourtId = new Map<string, MatchListItem[]>();
  for (const m of dayMatches) {
    if (!m.courtId) continue;
    const list = matchesByCourtId.get(m.courtId) ?? [];
    list.push(m);
    matchesByCourtId.set(m.courtId, list);
  }

  return (
    <div className="deuceup-print-page mx-auto flex min-h-screen max-w-[1400px] flex-col gap-0 bg-background print:min-h-0">
      <style>
        {`@media print {
          @page { size: landscape; margin: 10mm; }
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .deuceup-print-page { --court-min: ${COURT_COL_MIN_PX}px; --grid-h: ${SCREEN_GRID_HEIGHT_PX}px; }
        @media print {
          .deuceup-print-page { --court-min: 0px; --grid-h: ${PRINT_GRID_HEIGHT_MM}mm; }
        }`}
      </style>

      <div className="flex items-center justify-between gap-4 px-6 pt-6 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Planificación del día</h1>
          <p className="text-sm text-muted-foreground">Vista lista para compartir o guardar como PDF (Ctrl/Cmd+P → Guardar como PDF).</p>
        </div>
        <PrintButton />
      </div>

      {/*
        Colores fijos (no los tokens --inverse/--inverse-foreground, que se
        invierten según el tema claro/oscuro) — esto es un panel de marca
        "comprometido" a propósito, igual criterio que el panel de login
        (ver docs/DESIGN.md: "el único lugar donde la estrategia de color
        se vuelve Comprometida... fijo, sin importar el tema"). Con los
        tokens que invierten, este panel se volvía casi blanco con texto
        casi negro en tema oscuro — bug real, confirmado en pantalla.
      */}
      <div className="relative mx-6 mt-6 overflow-hidden rounded-2xl bg-[#16171a] px-7 py-5 bg-[radial-gradient(circle_at_14%_0%,var(--accent-glow),transparent_62%)] print:mx-0 print:mt-0 print:rounded-none print:py-3">
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div>
              <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-[#f5f5f3] print:text-[18px]">{tournament.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#f5f5f3]/70">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-accent" weight="fill" />
                  {tournament.clubName}
                </span>
                <span className="flex items-center gap-1.5">
                  <UsersThree className="size-3.5 text-accent" weight="fill" />
                  {dayMatches.length} partido{dayMatches.length === 1 ? "" : "s"} · {courts.length} pista{courts.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 border-l border-[#f5f5f3]/15 pl-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">{weekday}</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-[32px] font-semibold leading-none tabular-nums text-[#f5f5f3] print:text-[26px]">{day}</span>
                <span className="text-[11px] font-medium uppercase text-[#f5f5f3]/70">
                  {month}
                  <br />
                  {year}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-5 print:px-0 print:py-2">
        {!range || courts.length === 0 ? (
          <EmptyState
            icon={CalendarBlank}
            title="Sin partidos programados ese día"
            description="No hay partidos con horario y pista asignados para la fecha seleccionada."
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="grid" style={{ gridTemplateColumns: `14mm repeat(${courts.length}, minmax(var(--court-min), 1fr))`, minWidth: `calc(14mm + ${courts.length} * var(--court-min, 0px))` }}>
              <div />
              {courts.map((c) => (
                <div key={c.id} className="border-l border-border px-1 pb-1.5 text-center text-[9.5px] font-semibold uppercase tracking-wide text-foreground">
                  {c.name}
                </div>
              ))}

              <div className="relative" style={{ height: "var(--grid-h)" }}>
                {hourMarks.map((mark) => (
                  <div
                    key={mark.minutes}
                    style={{ top: `${percentInRange(mark.minutes, range)}%` }}
                    className={`absolute right-1.5 -translate-y-1/2 text-[8.5px] tabular-nums ${mark.major ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}
                  >
                    {mark.label}
                  </div>
                ))}
              </div>
              {courts.map((c) => (
                <div key={c.id} className="relative border-l border-border" style={{ height: "var(--grid-h)" }}>
                  {hourMarks.map((mark) => (
                    <div
                      key={mark.minutes}
                      style={{ top: `${percentInRange(mark.minutes, range)}%` }}
                      className={`pointer-events-none absolute inset-x-0 border-t ${mark.major ? "border-border-strong" : "border-dashed border-border/60"}`}
                    />
                  ))}
                  {(matchesByCourtId.get(c.id) ?? []).map((m) => {
                    const startMinutes = timeKeyToMinutes(zonedTimeKey(m.scheduledStart!, tournament.clubTimeZone));
                    const endMinutes = timeKeyToMinutes(zonedTimeKey(m.scheduledEnd ?? m.scheduledStart!, tournament.clubTimeZone));
                    const duration = Math.max(15, endMinutes - startMinutes);
                    const tier = densityTier(duration, range);
                    const timeRange = matchTimeRangeLabel(m, tournament.clubTimeZone);
                    return (
                      <div
                        key={m.id}
                        style={{
                          top: `${percentInRange(startMinutes, range)}%`,
                          height: `max(${percentInRange(startMinutes + duration, range) - percentInRange(startMinutes, range)}%, 3.2mm)`,
                        }}
                        className="absolute inset-x-[2px] overflow-hidden rounded bg-accent-muted px-1 py-0.5"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className={`font-bold uppercase tracking-wide text-accent-text ${tier === "tiny" ? "text-[6.5px]" : "text-[7.5px]"}`}>
                            {m.categoryName}
                          </span>
                          {timeRange && tier !== "tiny" && (
                            <span className="shrink-0 text-[6.5px] font-semibold tabular-nums text-accent-text/70">{timeRange}</span>
                          )}
                        </div>
                        {tier === "tiny" ? (
                          timeRange && <span className="block truncate text-[7px] font-semibold tabular-nums text-accent-text">{timeRange}</span>
                        ) : (
                          <>
                            <span className="block truncate text-[8px] font-medium leading-tight text-foreground">{matchTeamLabel(m.teamA)}</span>
                            {tier === "full" && (
                              <span className="block text-[6.5px] font-semibold uppercase tracking-wide text-accent-text/60">vs</span>
                            )}
                            <span className="block truncate text-[8px] font-medium leading-tight text-foreground">{matchTeamLabel(m.teamB)}</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {dayMatches.length > 0 && (
        <p className="px-6 pb-2 text-[10px] text-muted-foreground print:px-0">
          {dayMatches.length} partido{dayMatches.length === 1 ? "" : "s"} programado{dayMatches.length === 1 ? "" : "s"} para este día.
        </p>
      )}

      <div className="flex items-center justify-center border-t border-border px-6 py-4 print:py-2">
        <DeuceUpWordmark className="h-7 w-auto text-foreground print:h-5" />
      </div>
    </div>
  );
}
