import Link from "next/link";
import type { DiscoveryTournamentCard } from "../application/getDiscoveryData";

function formatEntryFee(fee: number | null, currency: string | null): string {
  if (fee == null) return "Consultar costo";
  return `${currency ?? "USD"} ${fee.toFixed(2)}`;
}

function formatDate(date: string | null): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString("es-VE", { day: "numeric", month: "short", year: "numeric" });
}

export function TournamentDiscoveryCard({ tournament }: { tournament: DiscoveryTournamentCard }) {
  const dateLabel = formatDate(tournament.startDate);

  return (
    <Link
      href={`/descubrir/${tournament.tournamentId}`}
      className="flex gap-3 rounded-lg border border-border-strong p-4 hover:bg-surface-secondary"
    >
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-secondary">
        {tournament.clubLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tournament.clubLogoUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-xs font-medium text-muted-foreground">
            {tournament.clubName.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <span className="truncate text-sm font-semibold">{tournament.name}</span>
          {tournament.distanceKm != null && (
            <span className="shrink-0 text-xs font-medium text-accent">{tournament.distanceKm} km</span>
          )}
        </div>
        <span className="truncate text-xs text-muted-foreground">
          {tournament.clubName}
          {tournament.clubCity ? ` · ${tournament.clubCity}` : ""}
        </span>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {dateLabel && <span>{dateLabel}</span>}
          {tournament.categories.length > 0 && <span>{tournament.categories.join(" · ")}</span>}
        </div>
        <span className="text-xs font-medium text-foreground">
          {formatEntryFee(tournament.entryFee, tournament.entryFeeCurrency)}
        </span>
      </div>
    </Link>
  );
}
