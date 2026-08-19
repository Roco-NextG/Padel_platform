import type { MatchParticipant, MatchWithContext } from "../domain/match";
import { isSetTiebreak } from "../domain/match";
import { cn } from "@/lib/utils";

function teamLabel(team: MatchWithContext["teamA"]): string {
  return team.players.map((p) => p.firstName).join(" / ") || "Equipo";
}

function PlayerAvatar({ player }: { player: MatchParticipant }) {
  if (player.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={player.photoUrl}
        alt=""
        className="size-5 shrink-0 rounded-full border-2 border-surface bg-surface-secondary object-cover"
      />
    );
  }
  const initials = player.firstName.charAt(0).toUpperCase() || "?";
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-surface bg-surface-secondary text-[9px] font-semibold text-muted-foreground">
      {initials}
    </span>
  );
}

/** avatar(es) + nombre en la misma fila que el marcador (redesign/partidos-vivo §2) — hasta 2 jugadores, el segundo superpuesto sobre el primero. */
function AvatarPair({ team }: { team: MatchWithContext["teamA"] }) {
  return (
    <div className="flex shrink-0">
      {team.players.slice(0, 2).map((p, i) => (
        <div key={p.playerId} className={i > 0 ? "-ml-2" : undefined}>
          <PlayerAvatar player={p} />
        </div>
      ))}
    </div>
  );
}

function ScoreCells({ sets, side }: { sets: MatchWithContext["sets"]; side: "A" | "B" }) {
  if (sets.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return (
    <>
      {sets.map((s) => {
        const games = side === "A" ? s.teamAGames : s.teamBGames;
        const showTb = isSetTiebreak(s.teamAGames, s.teamBGames) && games === 7;
        return (
          <span key={s.setNumber} className="font-display text-2xl font-semibold tabular-nums">
            {games}
            {showTb && <sup className="ml-0.5 text-[10px] font-semibold text-muted-foreground">TB</sup>}
          </span>
        );
      })}
    </>
  );
}

export function MatchScoreline({ match }: { match: MatchWithContext }) {
  const isTeamAWinner = match.winnerTeamId === match.teamA.teamId;
  const isTeamBWinner = match.winnerTeamId === match.teamB.teamId;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <AvatarPair team={match.teamA} />
          <span
            className={cn(
              "truncate text-sm font-medium",
              isTeamAWinner ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {teamLabel(match.teamA)}
          </span>
        </div>
        <div className="flex gap-2">
          <ScoreCells sets={match.sets} side="A" />
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <AvatarPair team={match.teamB} />
          <span
            className={cn(
              "truncate text-sm font-medium",
              isTeamBWinner ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {teamLabel(match.teamB)}
          </span>
        </div>
        <div className="flex gap-2">
          <ScoreCells sets={match.sets} side="B" />
        </div>
      </div>
    </div>
  );
}
