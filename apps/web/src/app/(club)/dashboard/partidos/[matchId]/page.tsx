import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMatchDetail } from "@/modules/matches/application/getMatches";
import { MatchStatusBadge } from "@/modules/matches/ui/match-status-badge";
import { MatchScoreline } from "@/modules/matches/ui/match-scoreline";
import { ScoreEntryForm } from "@/modules/matches/ui/score-entry-form";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Partido — Padel Platform" };

function teamLabel(team: { players: { firstName: string }[] }): string {
  return team.players.map((p) => p.firstName).join(" / ") || "Equipo";
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const detail = await getMatchDetail(matchId);
  if (!detail) notFound();

  const { match, confirmations } = detail;
  const canSubmit = match.status === "SCHEDULED" || match.status === "IN_PROGRESS";
  const canResolve = match.status === "DISPUTED";

  return (
    <div className="flex max-w-xl flex-col gap-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {teamLabel(match.teamA)} <span className="text-muted-foreground">vs</span>{" "}
            {teamLabel(match.teamB)}
          </h1>
          {match.tournamentName && (
            <p className="text-sm text-muted-foreground">{match.tournamentName}</p>
          )}
        </div>
        <MatchStatusBadge status={match.status} />
      </div>

      {match.sets.length > 0 && (
        <div className="rounded-lg border border-border p-4">
          <MatchScoreline match={match} />
        </div>
      )}

      {match.status === "PENDING_CONFIRMATION" && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Confirmaciones</h2>
          <div className="flex flex-wrap gap-2">
            {confirmations.map((c) => {
              const player = [...match.teamA.players, ...match.teamB.players].find(
                (p) => p.playerId === c.playerId
              );
              const tone = c.confirmed === true ? "success" : c.confirmed === false ? "destructive" : "neutral";
              const label = c.confirmed === true ? "Confirmó" : c.confirmed === false ? "Rechazó" : "Pendiente";
              return (
                <Badge key={c.playerId} tone={tone}>
                  {player?.firstName ?? "Jugador"}: {label}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {(canSubmit || canResolve) && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            {canResolve ? "Resolver disputa (reemplaza el resultado registrado)" : "Registrar resultado"}
          </h2>
          <ScoreEntryForm match={match} asOrganizer />
        </div>
      )}
    </div>
  );
}
