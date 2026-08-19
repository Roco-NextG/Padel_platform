import type { TournamentLiveMatch } from "../infrastructure/tournamentRepository";

function formatTime(iso: string | null): string {
  if (!iso) return "Sin horario";
  return new Date(iso).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });
}

function MatchChip({ match, live }: { match: TournamentLiveMatch; live: boolean }) {
  return (
    <div
      className={
        "flex shrink-0 flex-col gap-0.5 rounded-lg border px-3 py-2 text-xs " +
        (live ? "border-accent-strong bg-accent-muted" : "border-border bg-surface")
      }
    >
      <span className="font-medium text-foreground">
        {match.teamAName} <span className="text-muted-foreground">vs</span> {match.teamBName}
      </span>
      <span className="text-muted-foreground">{live ? "En vivo" : formatTime(match.scheduledStart)}</span>
    </div>
  );
}

/** Franja "en vivo / próximos" a nivel de todo el torneo — cruza categorías (grupos y bracket), no solo la seleccionada (redesign/torneo-bracket §7). */
export function LiveUpcomingStrip({
  liveMatches,
  upcomingMatches,
}: {
  liveMatches: TournamentLiveMatch[];
  upcomingMatches: TournamentLiveMatch[];
}) {
  if (liveMatches.length === 0 && upcomingMatches.length === 0) return null;

  return (
    <div className="flex items-center gap-4 overflow-x-auto rounded-lg border border-border bg-surface px-4 py-3">
      {liveMatches.length > 0 && (
        <>
          <div className="flex shrink-0 items-center gap-1.5 text-xs font-bold tracking-wide text-accent-text uppercase">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-strong opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-accent-strong" />
            </span>
            En vivo
          </div>
          <div className="flex shrink-0 gap-2">
            {liveMatches.map((m) => (
              <MatchChip key={m.matchId} match={m} live />
            ))}
          </div>
        </>
      )}
      {liveMatches.length > 0 && upcomingMatches.length > 0 && (
        <div className="h-8 w-px shrink-0 bg-border" />
      )}
      {upcomingMatches.length > 0 && (
        <>
          <div className="shrink-0 text-xs font-bold tracking-wide text-muted-foreground uppercase">
            Próximos
          </div>
          <div className="flex shrink-0 gap-2">
            {upcomingMatches.slice(0, 8).map((m) => (
              <MatchChip key={m.matchId} match={m} live={false} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
