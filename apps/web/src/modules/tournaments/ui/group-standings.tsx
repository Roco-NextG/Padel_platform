import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GroupStandingsView } from "../infrastructure/bracketRepository";

/** Anatomía calcada de .group-card/.g-row (padel-platform.html): top 2 de cada grupo clasifican al cuadro, mismo criterio que balancedSeeding usa para sembrar. */
const QUALIFYING_SLOTS = 2;

export function GroupStandings({ groups }: { groups: GroupStandingsView[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {groups.map((g) => (
        <div key={g.groupId} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
          <h3 className="text-sm font-semibold text-foreground">{g.groupName}</h3>
          <div className="flex flex-col">
            {g.standings.map((s, i) => {
              const qualifies = i < QUALIFYING_SLOTS;
              return (
                <div
                  key={s.teamId}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2 py-2",
                    qualifies && "bg-accent-muted"
                  )}
                >
                  <span className={cn("w-4 text-xs font-medium", qualifies ? "text-accent-text" : "text-muted-foreground")}>
                    {i + 1}
                  </span>
                  <Avatar
                    name={s.teamLabel}
                    className={cn("size-7 text-[10px]", qualifies && "bg-accent text-accent-foreground")}
                  />
                  <span className={cn("flex-1 truncate text-xs font-medium", qualifies ? "text-accent-text" : "text-foreground")}>
                    {s.teamLabel}
                  </span>
                  <span className="w-12 text-right text-[11px] text-muted-foreground">
                    {s.matchesWon}/{s.matchesPlayed}
                  </span>
                  <span className="w-10 text-right text-[11px] text-muted-foreground">
                    {s.gameDiff >= 0 ? `+${s.gameDiff}` : s.gameDiff}
                  </span>
                  {qualifies && (
                    <Badge tone="accent" className="shrink-0">
                      Clasifica
                    </Badge>
                  )}
                  {s.requiresManualResolution && (
                    <Badge tone="warning" className="shrink-0">
                      Empate
                    </Badge>
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
