import { Trophy } from "@phosphor-icons/react/dist/ssr";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { phaseLabel, type BracketRoundView, type BracketTeamInfo } from "../domain/bracket";

function teamLabel(team: BracketTeamInfo | null): string {
  if (!team) return "Por definir";
  return team.players.map((p) => `${p.firstName} ${p.lastName}`.trim()).join(" / ");
}

function BracketTeamRow({ team, isWinner, position }: { team: BracketTeamInfo | null; isWinner: boolean; position: "top" | "bottom" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-2",
        position === "top" ? "rounded-t-md border-b border-border" : "rounded-b-md",
        isWinner ? "bg-accent-muted" : "bg-surface"
      )}
    >
      {team?.seed ? <span className="w-4 shrink-0 text-[10px] text-muted-foreground">{team.seed}</span> : <span className="w-4 shrink-0" />}
      <Avatar name={teamLabel(team)} className={cn("size-6 text-[9px]", isWinner && "bg-accent text-accent-foreground")} />
      <span className={cn("truncate text-xs", isWinner ? "font-semibold text-accent-text" : "text-muted-foreground")}>
        {teamLabel(team)}
      </span>
    </div>
  );
}

export function BracketView({ rounds }: { rounds: BracketRoundView[] }) {
  return (
    <div className="flex gap-6 overflow-x-auto pb-2">
      {rounds.map((round) => (
        <div key={round.phaseId} className="flex w-[236px] shrink-0 flex-col gap-3">
          <span className="text-xs font-medium text-muted-foreground">{phaseLabel(round.type)}</span>
          <div className="flex flex-col justify-around gap-5" style={{ minHeight: `${round.matches.length * 84}px` }}>
            {round.matches.map((m) => {
              const isFinalWinner = round.type === "FINAL" && m.winnerTeamId;
              return (
                <div key={`${round.phaseId}-${m.roundIndex}`} className="flex flex-col gap-3">
                  <div className="overflow-hidden rounded-md border border-border shadow-sm">
                    <BracketTeamRow team={m.teamA} isWinner={m.winnerTeamId === m.teamA?.teamId} position="top" />
                    <BracketTeamRow team={m.teamB} isWinner={m.winnerTeamId === m.teamB?.teamId} position="bottom" />
                  </div>
                  {isFinalWinner && (
                    <div className="flex items-center gap-2 rounded-md bg-surface-secondary px-3 py-2.5 text-xs">
                      <Trophy className="size-4 text-accent-text" weight="fill" />
                      <span className="font-medium text-foreground">Campeón</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
