import type { MatchWithContext } from "../domain/match";
import { cn } from "@/lib/utils";

function teamLabel(team: MatchWithContext["teamA"]): string {
  return team.players.map((p) => p.firstName).join(" / ") || "Equipo";
}

export function MatchScoreline({ match }: { match: MatchWithContext }) {
  const isTeamAWinner = match.winnerTeamId === match.teamA.teamId;
  const isTeamBWinner = match.winnerTeamId === match.teamB.teamId;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <span
          className={cn(
            "truncate text-sm font-medium",
            isTeamAWinner ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {teamLabel(match.teamA)}
        </span>
        <div className="flex gap-2">
          {match.sets.length === 0 ? (
            <span className="text-sm text-muted-foreground">—</span>
          ) : (
            match.sets.map((s) => (
              <span key={s.setNumber} className="font-display text-2xl font-semibold tabular-nums">
                {s.teamAGames}
                {s.tiebreakA != null && (
                  <sup className="ml-0.5 text-xs font-normal text-muted-foreground">{s.tiebreakA}</sup>
                )}
              </span>
            ))
          )}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <span
          className={cn(
            "truncate text-sm font-medium",
            isTeamBWinner ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {teamLabel(match.teamB)}
        </span>
        <div className="flex gap-2">
          {match.sets.map((s) => (
            <span key={s.setNumber} className="font-display text-2xl font-semibold tabular-nums">
              {s.teamBGames}
              {s.tiebreakB != null && (
                <sup className="ml-0.5 text-xs font-normal text-muted-foreground">{s.tiebreakB}</sup>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
