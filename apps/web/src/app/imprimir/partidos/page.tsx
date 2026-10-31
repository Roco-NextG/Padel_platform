import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr";
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

const SLOT_MINUTES = 30;

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
 * la app entera. Pedido explícito: horizontal, con el calendario completo
 * (todas las pistas, todos los partidos del día) tal como se ve en el
 * planificador, pero legible y compartible — ambas parejas siempre
 * completas, nada truncado.
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
  const dateLabel = formatZonedDate(dateLabelIso, { weekday: "long", day: "numeric", month: "long", year: "numeric" }, tournament.clubTimeZone);

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
    <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-6 bg-background px-6 py-8 print:bg-white print:px-0 print:py-0 print:text-black">
      <style>{"@media print { @page { size: landscape; margin: 12mm; } }"}</style>

      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Planificación del día</h1>
          <p className="text-sm text-muted-foreground">Vista lista para compartir o guardar como PDF (Ctrl/Cmd+P → Guardar como PDF).</p>
        </div>
        <PrintButton />
      </div>

      <div className="flex items-end justify-between gap-4 border-b border-border pb-4 print:border-black">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground print:text-black">{tournament.clubName}</span>
          <h2 className="text-2xl font-semibold text-foreground print:text-black">{tournament.name}</h2>
          <span className="text-sm capitalize text-muted-foreground print:text-black">{dateLabel}</span>
        </div>
        <DeuceUpWordmark className="h-7 w-auto shrink-0 text-foreground print:text-black" />
      </div>

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
              <tr className="border-b border-border print:border-black">
                <th className="w-16 py-2 pr-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground print:text-black">
                  Hora
                </th>
                {courts.map((c) => (
                  <th
                    key={c.id}
                    className="border-l border-border px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground print:border-black print:text-black"
                  >
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((time) => (
                <tr key={time} className="border-b border-border align-top print:border-black">
                  <td className="whitespace-nowrap py-1.5 pr-2 text-[10px] font-semibold text-foreground print:text-black">{time}</td>
                  {courts.map((c) => {
                    const key = `${c.id}:${time}`;
                    if (covered.has(key)) return null;
                    const cell = placedByCell.get(key);
                    return (
                      <td key={c.id} className="border-l border-border p-1 print:border-black" rowSpan={cell?.rowSpan}>
                        {cell && (
                          <div className="flex flex-col gap-0.5 rounded bg-surface-secondary p-1.5 print:bg-[#f2f2f2]">
                            <span className="text-[8px] font-bold uppercase tracking-wide text-accent-text print:text-black">
                              {cell.match.categoryName}
                            </span>
                            <span className="text-[9.5px] font-medium leading-snug text-foreground print:text-black">
                              {matchTeamLabel(cell.match.teamA)}
                            </span>
                            <span className="text-[7.5px] font-semibold uppercase text-muted-foreground print:text-black">vs</span>
                            <span className="text-[9.5px] font-medium leading-snug text-foreground print:text-black">
                              {matchTeamLabel(cell.match.teamB)}
                            </span>
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

      {dayMatches.length > 0 && (
        <p className="text-xs text-muted-foreground print:text-black">
          {dayMatches.length} partido{dayMatches.length === 1 ? "" : "s"} programado{dayMatches.length === 1 ? "" : "s"} para este día.
        </p>
      )}
    </div>
  );
}
