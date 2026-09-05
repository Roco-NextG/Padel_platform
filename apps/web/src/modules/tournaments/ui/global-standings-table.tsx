import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { GlobalStandingsEntry } from "../domain/bracket";

const GRID_COLS = "grid-cols-[32px_1fr_56px_72px_76px_76px]";

function SignedStat({ value }: { value: number }) {
  return (
    <span
      className={cn(
        "tabular-nums",
        value > 0 ? "text-accent-text" : value < 0 ? "text-cancel" : "text-muted-foreground"
      )}
    >
      {value > 0 ? "+" : ""}
      {value}
    </span>
  );
}

/**
 * Tabla global de fortaleza (04_TOURNAMENT_ENGINE.md §4.1) — TODAS las
 * parejas clasificadas de TODOS los grupos, en el orden exacto en que
 * balancedSeeding() las siembra en el cuadro (entries ya viene ordenado del
 * servidor, esta tabla no reordena nada). Patrón visual calcado de la tabla
 * de posiciones de Liga (padel-platform_8.html: .lg-standings-card/-row):
 * misma grilla, fila líder resaltada, radios y spacing — acá es de UNA fase
 * de grupos en vez de acumulado de temporada.
 */
export function GlobalStandingsTable({ entries }: { entries: GlobalStandingsEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-muted-foreground">
        Todavía no hay resultados confirmados en la fase de grupos.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div
        className={cn(
          "grid items-center gap-2 border-b border-border px-4 py-3 text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground",
          GRID_COLS
        )}
      >
        <span>#</span>
        <span>Pareja</span>
        <span className="text-center">PG</span>
        <span className="text-center">Juegos</span>
        <span className="text-center">Dif. sets</span>
        <span className="text-center">Dif. games</span>
      </div>
      <div>
        {entries.map((e, i) => (
          <div
            key={e.teamId}
            className={cn(
              "grid items-center gap-2 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-surface-secondary",
              GRID_COLS,
              i === 0 && "bg-accent-tint hover:bg-accent-tint"
            )}
          >
            <span className={cn("text-[13px] font-semibold tabular-nums", i === 0 ? "text-accent-text" : "text-muted-foreground")}>
              {i + 1}
            </span>
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar name={e.teamLabel} className="size-7 shrink-0 text-[10px]" />
              <div className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5 truncate text-[13px] font-medium text-foreground">
                  {e.teamLabel}
                  {e.requiresManualResolution && (
                    <Badge tone="warning" className="shrink-0 px-1.5 py-0 text-[9px]">
                      Empate
                    </Badge>
                  )}
                </span>
                <span className="truncate text-[10.5px] text-muted-foreground">{e.groupName}</span>
              </div>
            </div>
            <span className="text-center text-[13px] font-semibold tabular-nums text-foreground">{e.matchesWon}</span>
            <span className="text-center text-[12px] tabular-nums text-muted-foreground">
              {e.gamesWon}-{e.gamesLost}
            </span>
            <span className="text-center text-[13px] font-semibold">
              <SignedStat value={e.setDiff} />
            </span>
            <span className="text-center text-[13px] font-semibold">
              <SignedStat value={e.gameDiff} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
