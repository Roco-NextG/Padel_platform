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

/** Igual granularidad que el planificador en pantalla (scheduler-board.tsx) — un partido puede arrancar cada 15min ahí, así que esta grilla necesita el mismo paso o los partidos que no caigan en :00/:30 desaparecerían del PDF (buildDaySlots no encontraría su horario de inicio). */
const SLOT_MINUTES = 15;

function timeKeyToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTimeKey(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Rango de horarios a mostrar — acotado al primer/último partido del día (redondeado al bloque de 30min), no las 24h fijas del planificador: acá es para imprimir, no para arrastrar y soltar, así que no tiene sentido mostrar filas vacías de la madrugada. */
function buildDaySlots(matches: MatchListItem[], timeZone: string): string[] {
  if (matches.length === 0) return [];
  let minMinutes = Infinity;
  let maxMinutes = -Infinity;
  for (const m of matches) {
    const startMinutes = timeKeyToMinutes(zonedTimeKey(m.scheduledStart!, timeZone));
    const endMinutes = timeKeyToMinutes(zonedTimeKey(m.scheduledEnd ?? m.scheduledStart!, timeZone));
    minMinutes = Math.min(minMinutes, startMinutes);
    maxMinutes = Math.max(maxMinutes, Math.max(endMinutes, startMinutes + SLOT_MINUTES));
  }
  const start = Math.floor(minMinutes / SLOT_MINUTES) * SLOT_MINUTES;
  const end = Math.ceil(maxMinutes / SLOT_MINUTES) * SLOT_MINUTES;
  const slots: string[] = [];
  for (let t = start; t < end; t += SLOT_MINUTES) slots.push(minutesToTimeKey(t));
  return slots;
}

/**
 * Ruta fuera de (club) a propósito — sin el sidebar/header del panel, para
 * que "Guardar como PDF" (window.print) imprima solo la planificación, no
 * la app entera. Horizontal, con el calendario completo (todas las pistas,
 * todos los partidos del día) tal como se ve en el planificador, pero
 * legible y compartible — ambas parejas siempre completas, nada truncado.
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

  const slots = buildDaySlots(dayMatches, tournament.clubTimeZone);
  const slotIndex = new Map(slots.map((t, i) => [t, i]));

  // Una celda por partido, con el rowSpan que corresponda a su duración real
  // (en bloques de 30min) — las celdas que esa duración cubre por debajo se
  // marcan en `covered` para no renderizarlas (el <td> de arriba ya las
  // ocupa vía rowSpan, como en cualquier calendario impreso).
  const placedByCell = new Map<string, { match: MatchListItem; rowSpan: number }>();
  const covered = new Set<string>();
  for (const m of dayMatches) {
    const startTime = zonedTimeKey(m.scheduledStart!, tournament.clubTimeZone);
    const startIdx = slotIndex.get(startTime);
    if (startIdx === undefined) continue;
    const endTime = zonedTimeKey(m.scheduledEnd ?? m.scheduledStart!, tournament.clubTimeZone);
    const spanMinutes = Math.max(SLOT_MINUTES, timeKeyToMinutes(endTime) - timeKeyToMinutes(startTime));
    const rowSpan = Math.ceil(spanMinutes / SLOT_MINUTES);
    placedByCell.set(`${m.courtId}:${startTime}`, { match: m, rowSpan });
    for (let i = 1; i < rowSpan; i++) {
      const idx = startIdx + i;
      if (idx >= slots.length) break;
      covered.add(`${m.courtId}:${slots[idx]}`);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-0 bg-background print:min-h-0">
      <style>
        {`@media print {
          @page { size: landscape; margin: 10mm; }
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
      <div className="relative mx-6 mt-6 overflow-hidden rounded-2xl bg-[#16171a] px-7 py-6 bg-[radial-gradient(circle_at_14%_0%,var(--accent-glow),transparent_62%)] print:mx-0 print:mt-0 print:rounded-none">
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-[26px] font-semibold leading-tight tracking-tight text-[#f5f5f3]">{tournament.name}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#f5f5f3]/70">
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
              <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">{weekday}</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-[44px] font-semibold leading-none tabular-nums text-[#f5f5f3]">{day}</span>
                <span className="text-sm font-medium uppercase text-[#f5f5f3]/70">
                  {month}
                  <br />
                  {year}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 print:px-0 print:py-4">
        {dayMatches.length === 0 || courts.length === 0 ? (
          <EmptyState
            icon={CalendarBlank}
            title="Sin partidos programados ese día"
            description="No hay partidos con horario y pista asignados para la fecha seleccionada."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="w-16 border-b-2 border-b-accent-strong py-2 pr-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Hora
                  </th>
                  {courts.map((c) => (
                    <th
                      key={c.id}
                      className="border-b-2 border-b-accent-strong border-l border-l-border px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-foreground"
                    >
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slots.map((time) => (
                  // Zebra por HORA (no por fila) — con filas cada 15min, alternar por índice de fila
                  // tiñe :15/:45 en vez de agrupar visualmente cada hora completa.
                  <tr key={time} className={Number(time.slice(0, 2)) % 2 === 1 ? "bg-surface-secondary/50" : undefined}>
                    <td
                      className={`whitespace-nowrap py-1.5 pr-2 text-[10px] text-foreground ${
                        time.endsWith(":00") ? "font-bold" : time.endsWith(":30") ? "font-medium text-muted-foreground" : "font-normal text-muted-foreground/70"
                      }`}
                    >
                      {time}
                    </td>
                    {courts.map((c) => {
                      const key = `${c.id}:${time}`;
                      if (covered.has(key)) return null;
                      const cell = placedByCell.get(key);
                      return (
                        <td key={c.id} className="border-l border-border p-1 align-top" rowSpan={cell?.rowSpan}>
                          {cell && (
                            <div className="flex h-full flex-col gap-0.5 rounded-md bg-accent-muted p-1.5">
                              <span className="text-[8px] font-bold uppercase tracking-wide text-accent-text">{cell.match.categoryName}</span>
                              <span className="text-[9.5px] font-medium leading-snug text-foreground">{matchTeamLabel(cell.match.teamA)}</span>
                              <span className="text-[7.5px] font-semibold uppercase text-accent-text/70">vs</span>
                              <span className="text-[9.5px] font-medium leading-snug text-foreground">{matchTeamLabel(cell.match.teamB)}</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center border-t border-border px-6 py-8 print:py-5">
        <DeuceUpWordmark className="h-10 w-auto text-foreground" />
      </div>
    </div>
  );
}
