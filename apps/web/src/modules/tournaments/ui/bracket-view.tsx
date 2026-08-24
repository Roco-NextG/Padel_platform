import { Trophy } from "@phosphor-icons/react/dist/ssr";
import { phaseLabel, type BracketRoundView, type BracketTeamInfo } from "../domain/bracket";

function teamLabel(team: BracketTeamInfo | null): string {
  if (!team) return "Por definir";
  const names = team.players.map((p) => `${p.firstName} ${p.lastName}`.trim()).join(" / ");
  return team.seed ? `${names} (${team.seed})` : names;
}

export function BracketView({ rounds }: { rounds: BracketRoundView[] }) {
  return (
    <div className="flex gap-6 overflow-x-auto pb-2">
      {rounds.map((round) => (
        <div key={round.phaseId} className="flex w-56 shrink-0 flex-col gap-3">
          <span className="text-xs font-medium text-muted-foreground">{phaseLabel(round.type)}</span>
          <div className="flex flex-col justify-around gap-4" style={{ minHeight: `${round.matches.length * 72}px` }}>
            {round.matches.map((m) => {
              const isFinalWinner = round.type === "FINAL" && m.winnerTeamId;
              return (
                <div
                  key={`${round.phaseId}-${m.roundIndex}`}
                  className="flex flex-col gap-1 rounded-md border border-border bg-surface p-2.5 text-xs"
                >
                  <div className={m.winnerTeamId === m.teamA?.teamId ? "font-semibold text-foreground" : "text-muted-foreground"}>
                    {teamLabel(m.teamA)}
                  </div>
                  <div className={m.winnerTeamId === m.teamB?.teamId ? "font-semibold text-foreground" : "text-muted-foreground"}>
                    {teamLabel(m.teamB)}
                  </div>
                  {isFinalWinner && (
                    <div className="mt-1 flex items-center gap-1 text-accent-text">
                      <Trophy className="size-3.5" weight="fill" />
                      <span className="font-medium">Campeón</span>
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
