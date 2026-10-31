import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { requireTournamentManager } from "@/modules/tournaments/application/authGuard";
import { getTournament } from "@/modules/tournaments/application/getTournaments";
import { fetchMatchesForTournament } from "@/modules/matches/infrastructure/matchRepository";
import { matchTeamLabel } from "@/modules/matches/domain/match";
import { formatZonedDate, zonedDateKey, zonedSlotToIso, zonedTimeKey, todayZonedDateKey } from "@/lib/timezone";
import { EmptyState } from "@/components/ui/empty-state";
import { PrintButton } from "@/modules/matches/ui/print-button";

export const metadata: Metadata = { title: "Planificación del día — DeuceUp" };

/**
 * Ruta fuera de (club) a propósito — sin el sidebar/header del panel, para
 * que "Guardar como PDF" (window.print) imprima solo la planificación, no
 * la app entera. Pedido explícito: compartible, con ambas parejas y su
 * horario siempre visibles (nada truncado, a diferencia de la grilla del
 * planificador que prioriza densidad para arrastrar y soltar).
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

  const allMatches = await fetchMatchesForTournament(torneo);
  const dayMatches = allMatches
    .filter((m) => m.scheduledStart && m.courtId && zonedDateKey(m.scheduledStart, tournament.clubTimeZone) === selectedDate)
    .sort((a, b) => {
      if (a.scheduledStart! !== b.scheduledStart!) return a.scheduledStart! < b.scheduledStart! ? -1 : 1;
      return (a.courtName ?? "").localeCompare(b.courtName ?? "");
    });

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 bg-background px-6 py-8 print:bg-white print:px-0 print:py-0 print:text-black">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Planificación del día</h1>
          <p className="text-sm text-muted-foreground">Vista lista para compartir o guardar como PDF (Ctrl/Cmd+P → Guardar como PDF).</p>
        </div>
        <PrintButton />
      </div>

      <div className="flex flex-col gap-1 border-b border-border pb-4 print:border-black">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground print:text-black">{tournament.clubName}</span>
        <h2 className="text-2xl font-semibold text-foreground print:text-black">{tournament.name}</h2>
        <span className="text-sm capitalize text-muted-foreground print:text-black">{dateLabel}</span>
      </div>

      {dayMatches.length === 0 ? (
        <EmptyState
          icon={CalendarBlank}
          title="Sin partidos programados ese día"
          description="No hay partidos con horario y pista asignados para la fecha seleccionada."
        />
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground print:border-black print:text-black">
              <th className="py-2 pr-3">Hora</th>
              <th className="py-2 pr-3">Pista</th>
              <th className="py-2 pr-3">Categoría</th>
              <th className="py-2 pr-3">Pareja A</th>
              <th className="py-2">Pareja B</th>
            </tr>
          </thead>
          <tbody>
            {dayMatches.map((m) => (
              <tr key={m.id} className="border-b border-border align-top print:border-black">
                <td className="whitespace-nowrap py-2.5 pr-3 font-semibold text-foreground print:text-black">
                  {zonedTimeKey(m.scheduledStart!, tournament.clubTimeZone)}
                </td>
                <td className="whitespace-nowrap py-2.5 pr-3 text-foreground print:text-black">{m.courtName ?? "—"}</td>
                <td className="whitespace-nowrap py-2.5 pr-3 text-muted-foreground print:text-black">{m.categoryName}</td>
                <td className="py-2.5 pr-3 text-foreground print:text-black">{matchTeamLabel(m.teamA)}</td>
                <td className="py-2.5 text-foreground print:text-black">{matchTeamLabel(m.teamB)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {dayMatches.length > 0 && (
        <p className="text-xs text-muted-foreground print:text-black">
          {dayMatches.length} partido{dayMatches.length === 1 ? "" : "s"} programado{dayMatches.length === 1 ? "" : "s"} para este día.
        </p>
      )}
    </div>
  );
}
