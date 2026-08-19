import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { GroupStandingsView } from "../application/getGroupStandings";

/** Los 2 primeros de cada grupo avanzan (11_UX_HANDOFF.md §3.2) — puramente posicional sobre el array YA ordenado por calculateStandings, no se reordena ni recalcula nada acá. */
const QUALIFYING_SPOTS = 2;

export function GroupStandingsTable({ group }: { group: GroupStandingsView }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{group.groupName}</h3>
      {group.standings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay equipos en este grupo.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-1.5 pr-3">#</th>
                <th className="py-1.5 pr-3">Equipo</th>
                <th className="py-1.5 pr-3 text-right">PJ</th>
                <th className="py-1.5 pr-3 text-right">PG</th>
                <th className="py-1.5 pr-3 text-right">Games</th>
                <th className="py-1.5 pr-3 text-right">Dif. sets</th>
                <th className="py-1.5 text-right">Dif. games</th>
              </tr>
            </thead>
            <tbody>
              {group.standings.map((s, i) => {
                const qualifies = i < QUALIFYING_SPOTS;
                return (
                <tr
                  key={s.teamId}
                  className={cn(
                    "border-b border-border last:border-0",
                    qualifies && "bg-accent-muted/50",
                    s.requiresManualResolution && "bg-warning-muted/40"
                  )}
                >
                  <td className="py-1.5 pr-3 tabular-nums">{i + 1}</td>
                  <td className="py-1.5 pr-3">
                    <span className="inline-flex items-center gap-2">
                      {s.teamName}
                      {qualifies && <Badge tone="accent">Clasifica</Badge>}
                    </span>
                    {s.requiresManualResolution && (
                      <span className="ml-2 text-xs font-medium text-warning">
                        Empate — requiere resolución manual
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{s.matchesPlayed}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{s.matchesWon}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">
                    {s.gamesWon}-{s.gamesLost}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{s.setDiff}</td>
                  <td className="py-1.5 text-right tabular-nums">{s.gameDiff}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
