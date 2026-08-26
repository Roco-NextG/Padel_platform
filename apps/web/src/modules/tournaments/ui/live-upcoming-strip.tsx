import { matchTeamShortLabel, type MatchListItem } from "@/modules/matches/domain/match";

/** Anatomía calcada de .live-strip/.live-chip/.up-chip (padel-platform.html) — acotado a la categoría seleccionada del Cuadro. */
export function LiveUpcomingStrip({ matches }: { matches: MatchListItem[] }) {
  const live = matches.filter((m) => m.status === "IN_PROGRESS");
  const upcoming = matches
    .filter((m) => m.status === "SCHEDULED")
    .sort((a, b) => (a.scheduledStart ?? "").localeCompare(b.scheduledStart ?? ""));

  if (live.length === 0 && upcoming.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface/80 p-2.5 backdrop-blur-sm">
      {live.length > 0 && (
        <>
          <span className="flex shrink-0 items-center gap-1.5 pl-1 text-[10.5px] font-semibold uppercase tracking-wide text-accent-text">
            <span className="size-1.5 animate-pulse rounded-full bg-accent-strong" />
            En vivo
          </span>
          <div className="flex min-w-0 gap-2 overflow-x-auto [scrollbar-width:none]">
            {live.map((m) => (
              <div key={m.id} className="flex shrink-0 flex-col gap-0.5 rounded-lg bg-surface-secondary px-3 py-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{m.courtName ?? ""}</span>
                <span className="text-xs font-medium text-foreground">
                  {matchTeamShortLabel(m.teamA)} <span className="text-muted-foreground">vs</span> {matchTeamShortLabel(m.teamB)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {live.length > 0 && upcoming.length > 0 && <div className="h-6 w-px shrink-0 bg-border" />}

      {upcoming.length > 0 && (
        <>
          <span className="shrink-0 pl-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">Próximos</span>
          <div className="flex min-w-0 gap-2 overflow-x-auto [scrollbar-width:none]">
            {upcoming.map((m) => (
              <div key={m.id} className="flex shrink-0 flex-col gap-0.5 rounded-lg bg-surface-secondary px-3 py-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                  {m.scheduledStart
                    ? new Date(m.scheduledStart).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit", timeZone: "America/Caracas" })
                    : ""}
                  {m.courtName ? ` · ${m.courtName}` : ""}
                </span>
                <span className="text-xs font-medium text-foreground">
                  {matchTeamShortLabel(m.teamA)} <span className="text-muted-foreground">vs</span> {matchTeamShortLabel(m.teamB)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
