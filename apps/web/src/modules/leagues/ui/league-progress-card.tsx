import { Card } from "@/components/ui/card";
import type { LeagueRoundView } from "../infrastructure/leagueStandingsRepository";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-VE", { day: "numeric", month: "short" });
}

/** Barra de progreso de temporada — "Jornada X de Y", mismo patrón visual que .lg-progress-card del mockup de Liga. */
export function LeagueProgressCard({ rounds }: { rounds: LeagueRoundView[] }) {
  const total = rounds.length;
  const played = rounds.filter((r) => r.played).length;
  const currentRoundNumber = played < total ? played + 1 : total;
  const currentRound = rounds[currentRoundNumber - 1];
  const progressPercent = total === 0 ? 0 : Math.round((played / total) * 100);
  const lastRound = rounds[total - 1];

  return (
    <Card className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-foreground">
          Jornada {currentRoundNumber} de {total} · posiciones a hoy
        </span>
        {formatDate(lastRound?.windowEnd ?? null) && (
          <span className="text-[11px] text-muted-foreground">Termina el {formatDate(lastRound.windowEnd)}</span>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="flex items-center justify-between text-[10.5px] text-muted-foreground">
        <span>Jornada 1</span>
        {currentRound && formatDate(currentRound.windowStart) && (
          <span>
            {formatDate(currentRound.windowStart)} — {formatDate(currentRound.windowEnd)}
          </span>
        )}
        <span>Jornada {total}</span>
      </div>
    </Card>
  );
}
