import type { Metadata } from "next";
import Link from "next/link";
import { CalendarBlank, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { getOrganizerMatchList } from "@/modules/matches/application/getMatches";
import { MatchStatusBadge } from "@/modules/matches/ui/match-status-badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Partidos — Padel Platform" };

export default async function ClubMatchesPage() {
  const matches = await getOrganizerMatchList();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Partidos</h1>

      {matches.length === 0 ? (
        <EmptyState
          icon={CalendarBlank}
          title="Todavía no hay partidos"
          description="Los partidos aparecen aquí una vez que un torneo genera su cuadro — el Tournament Engine conectado a la base de datos es la siguiente pieza del roadmap."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
          {matches.map((match) => (
            <li key={match.id}>
              <Link
                href={`/dashboard/partidos/${match.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-surface-secondary"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    Ronda {match.round_index ?? "—"} · {match.match_type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {match.scheduled_start
                      ? new Date(match.scheduled_start).toLocaleString("es-VE")
                      : "Sin horario asignado"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <MatchStatusBadge status={match.status} />
                  <CaretRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
