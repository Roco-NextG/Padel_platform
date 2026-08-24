import { Badge } from "@/components/ui/badge";
import type { GroupStandingsView } from "../infrastructure/bracketRepository";

export function GroupStandings({ groups }: { groups: GroupStandingsView[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {groups.map((g) => (
        <div key={g.groupId} className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-secondary text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">{g.groupName}</th>
                <th className="px-2 py-2 text-center font-medium">PJ</th>
                <th className="px-2 py-2 text-center font-medium">PG</th>
                <th className="px-2 py-2 text-center font-medium">Sets</th>
                <th className="px-2 py-2 text-center font-medium">Games</th>
              </tr>
            </thead>
            <tbody>
              {g.standings.map((s, i) => (
                <tr key={s.teamId} className="border-b border-border last:border-0">
                  <td className="flex items-center gap-1.5 px-3 py-2">
                    <span className="text-xs text-muted-foreground">{i + 1}</span>
                    {s.teamLabel}
                    {s.requiresManualResolution && (
                      <Badge tone="warning" className="ml-1">
                        Empate
                      </Badge>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center text-muted-foreground">{s.matchesPlayed}</td>
                  <td className="px-2 py-2 text-center text-muted-foreground">{s.matchesWon}</td>
                  <td className="px-2 py-2 text-center text-muted-foreground">
                    {s.setsWon}-{s.setsLost}
                  </td>
                  <td className="px-2 py-2 text-center text-muted-foreground">{s.gameDiff >= 0 ? `+${s.gameDiff}` : s.gameDiff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
