import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LeagueStandingsEntry } from "../domain/standings";

const GRID_COLS = "grid-cols-[32px_1fr_36px_36px_56px_56px_100px]";

function SignedStat({ value }: { value: number }) {
  return (
    <span className={cn("tabular-nums", value > 0 ? "text-accent-text" : value < 0 ? "text-cancel" : "text-muted-foreground")}>
      {value > 0 ? "+" : ""}
      {value}
    </span>
  );
}

/** Últimos hasta 5 resultados, orden cronológico (más antiguo a la izquierda, más reciente a la derecha) — mismo patrón .lg-form-dots del mockup de Liga. */
function FormDots({ form }: { form: ("W" | "L")[] }) {
  const last5 = form.slice(-5);
  if (last5.length === 0) return <span className="text-[10.5px] text-muted-foreground">—</span>;
  return (
    <div className="flex items-center justify-center gap-1">
      {last5.map((r, i) => (
        <span
          key={i}
          className={cn("size-1.5 rounded-full", r === "W" ? "bg-accent" : "bg-cancel/60")}
          title={r === "W" ? "Ganado" : "Perdido"}
        />
      ))}
    </div>
  );
}

/**
 * Tabla de posiciones de temporada de una Liga — mismo patrón visual que
 * GlobalStandingsTable (tournaments/ui/global-standings-table.tsx: grilla,
 * fila líder resaltada, Avatar, SignedStat), acá acumulado de TODAS las
 * jornadas en vez de una sola fase de grupos, con PJ y racha de forma
 * agregados (conceptos propios de temporada larga, sin equivalente en
 * Torneo).
 */
export function LeagueStandingsTable({ entries }: { entries: LeagueStandingsEntry[] }) {
  if (entries.length === 0) {
    return <p className="p-6 text-center text-sm text-muted-foreground">Todavía no hay resultados confirmados en esta categoría.</p>;
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
        <span className="text-center">PJ</span>
        <span className="text-center">PG</span>
        <span className="text-center">Sets</span>
        <span className="text-center">DG</span>
        <span className="text-center">Forma</span>
      </div>
      <div>
        {entries.map((e, i) => (
          <div
            key={e.teamId}
            className={cn(
              "grid items-center gap-2 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-surface-secondary",
              GRID_COLS,
              i === 0 && e.matchesPlayed > 0 && "bg-accent-tint hover:bg-accent-tint"
            )}
          >
            <span
              className={cn(
                "text-[13px] font-semibold tabular-nums",
                i === 0 && e.matchesPlayed > 0 ? "text-accent-text" : "text-muted-foreground"
              )}
            >
              {i + 1}
            </span>
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar name={e.teamLabel} className="size-7 shrink-0 text-[10px]" />
              <span className="flex min-w-0 items-center gap-1.5 truncate text-[13px] font-medium text-foreground">
                {e.teamLabel}
                {e.requiresManualResolution && (
                  <Badge tone="warning" className="shrink-0 px-1.5 py-0 text-[9px]">
                    Empate
                  </Badge>
                )}
              </span>
            </div>
            <span className="text-center text-[13px] tabular-nums text-muted-foreground">{e.matchesPlayed}</span>
            <span className="text-center text-[13px] font-semibold tabular-nums text-foreground">{e.matchesWon}</span>
            <span className="text-center text-[13px] font-semibold">
              <SignedStat value={e.setDiff} />
            </span>
            <span className="text-center text-[13px] font-semibold">
              <SignedStat value={e.gameDiff} />
            </span>
            <FormDots form={e.form} />
          </div>
        ))}
      </div>
    </div>
  );
}
