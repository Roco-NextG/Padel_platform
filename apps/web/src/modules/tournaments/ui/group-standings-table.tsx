import { cn } from "@/lib/utils";
import type { GroupStandingsView } from "../application/getGroupStandings";

/**
 * Función por encima de forma (indicación explícita del prompt) — una tabla
 * simple que se entiende es suficiente por ahora, sin pulir visualmente.
 */
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
              {group.standings.map((s, i) => (
                <tr
                  key={s.teamId}
                  className={cn(
                    "border-b border-border last:border-0",
                    s.requiresManualResolution && "bg-warning-muted/40"
                  )}
                >
                  <td className="py-1.5 pr-3 tabular-nums">{i + 1}</td>
                  <td className="py-1.5 pr-3">
                    {s.teamName}
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
