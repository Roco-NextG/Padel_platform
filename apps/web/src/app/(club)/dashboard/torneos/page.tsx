import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { getTournamentList } from "@/modules/tournaments/application/getTournaments";
import { TournamentStatusBadge } from "@/modules/tournaments/ui/tournament-status-badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Torneos — Padel Platform" };

export default async function ClubTournamentsPage() {
  const tournaments = await getTournamentList();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Torneos</h1>

      {tournaments.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Todavía no hay torneos"
          description="Crear torneos desde la plataforma llega en una próxima entrega — mientras tanto, se cargan directamente en la base de datos."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
          {tournaments.map((tournament) => (
            <li key={tournament.id}>
              <Link
                href={`/dashboard/torneos/${tournament.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-surface-secondary"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{tournament.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {tournament.start_date
                      ? new Date(tournament.start_date).toLocaleDateString("es-VE")
                      : "Sin fecha definida"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <TournamentStatusBadge status={tournament.status} />
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
