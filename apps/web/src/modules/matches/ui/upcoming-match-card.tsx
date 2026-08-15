import Link from "next/link";
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import type { MatchWithContext } from "../domain/match";
import { MatchStatusBadge } from "./match-status-badge";

function teamLabel(team: MatchWithContext["teamA"]): string {
  return team.players.map((p) => p.firstName).join(" / ") || "Equipo";
}

export function UpcomingMatchCard({ match }: { match: MatchWithContext }) {
  return (
    <Link
      href={`/dashboard/partidos/${match.id}`}
      className="flex flex-col gap-3 rounded-lg border border-border-strong p-4 hover:bg-surface-secondary"
    >
      <div className="flex items-center justify-between gap-3">
        {match.tournamentName ? (
          <p className="truncate text-xs font-medium text-muted-foreground">{match.tournamentName}</p>
        ) : (
          <span />
        )}
        <MatchStatusBadge status={match.status} />
      </div>

      <p className="text-sm font-medium">
        {teamLabel(match.teamA)} <span className="text-muted-foreground">vs</span> {teamLabel(match.teamB)}
      </p>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarBlank className="size-3.5" />
        {match.scheduledStart
          ? new Date(match.scheduledStart).toLocaleString("es-VE", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : "Sin horario asignado todavía"}
      </div>
    </Link>
  );
}
