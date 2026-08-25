import Link from "next/link";
import { CaretRight, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { matchStatusLabel, matchTeamLabel, type MatchListItem } from "@/modules/matches/domain/match";
import type { RecentResult } from "@/modules/matches/infrastructure/matchRepository";
import type { Court } from "@/modules/courts/domain/court";

export function LiveBand({ inProgress, pending, scheduled }: { inProgress: number; pending: number; scheduled: number }) {
  return (
    <Card className="glass flex flex-wrap items-center gap-x-8 gap-y-3 !rounded-2xl px-6 py-5">
      {inProgress > 0 && (
        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent-muted py-1.5 pl-2 pr-3 text-[11.5px] font-semibold tracking-wide text-accent-text">
          <span className="relative flex size-[7px]">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-strong opacity-60" />
            <span className="relative inline-flex size-full rounded-full bg-accent-strong" />
          </span>
          EN VIVO
        </div>
      )}
      <Stat num={inProgress} label="Partidos en juego" />
      <Stat num={pending} label="Resultados pendientes" />
      <Stat num={scheduled} label="Programados" />
    </Card>
  );
}

function Stat({ num, label }: { num: number; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-display text-3xl font-medium tracking-tight text-foreground">{num}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function UpcomingMatches({ matches }: { matches: MatchListItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-foreground">Próximos partidos</h2>
        <Link href="/dashboard/partidos" className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
          Ver todos <CaretRight className="size-3" />
        </Link>
      </div>
      <Card className="!p-0">
        {matches.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Sin partidos programados todavía.</p>
        ) : (
          matches.slice(0, 6).map((m) => <MatchRow key={m.id} match={m} />)
        )}
      </Card>
    </div>
  );
}

const STATUS_PILL_CLASSES: Record<string, string> = {
  IN_PROGRESS: "bg-accent-muted text-accent-text",
  PENDING_CONFIRMATION: "bg-warning-muted text-warning",
  DISPUTED: "bg-destructive-muted text-destructive",
  SCHEDULED: "bg-surface-secondary text-muted-foreground",
};

function MatchRow({ match }: { match: MatchListItem }) {
  const time = match.scheduledStart
    ? new Date(match.scheduledStart).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })
    : "--:--";

  return (
    <div className="flex items-center gap-4 border-b border-border px-4 py-3.5 last:border-0">
      <div className="min-w-14 text-center">
        <div className="text-[17px] font-medium text-foreground">{time}</div>
        <div className="mt-0.5 text-[9.5px] font-semibold tracking-wide text-foreground-tertiary">
          {(match.courtName ?? "SIN PISTA").toUpperCase()}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
        <span className="line-clamp-2 text-center text-[13px] font-medium text-foreground">{matchTeamLabel(match.teamA)}</span>
        <span className="shrink-0 text-[11px] text-foreground-tertiary">vs</span>
        <span className="line-clamp-2 text-center text-[13px] font-medium text-foreground">{matchTeamLabel(match.teamB)}</span>
      </div>
      <span className={cn("flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium", STATUS_PILL_CLASSES[match.status] ?? "bg-surface-secondary text-muted-foreground")}>
        {match.status === "IN_PROGRESS" && <span className="size-1.5 rounded-full bg-accent-strong" />}
        {matchStatusLabel(match.status)}
      </span>
    </div>
  );
}

export function CourtStatusCard({ courts, busyCourtIds }: { courts: Court[]; busyCourtIds: Set<string> }) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h3 className="text-sm font-medium text-foreground">Estado de pistas</h3>
      <div className="grid grid-cols-6 gap-2">
        {courts.map((c) => (
          <div
            key={c.id}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg border text-[10.5px] font-medium",
              busyCourtIds.has(c.id) ? "border-transparent bg-accent-muted text-accent-text" : "border-border text-foreground-tertiary"
            )}
          >
            {c.number ?? "·"}
          </div>
        ))}
      </div>
      <div className="flex gap-3.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <i className="inline-block size-2 rounded-sm bg-accent-muted" /> En juego
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block size-2 rounded-sm border border-border" /> Libre
        </span>
      </div>
    </Card>
  );
}

export function RecentResultsCard({ results }: { results: RecentResult[] }) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <h3 className="text-sm font-medium text-foreground">Últimos resultados</h3>
      {results.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin resultados todavía.</p>
      ) : (
        results.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-2 border-b border-border py-2 last:border-0 last:pb-0">
            <div>
              <div className="text-[12.5px] font-medium text-foreground">{r.winnerLabel}</div>
              <div className="text-xs text-muted-foreground">{r.scoreLabel}</div>
            </div>
            <CheckCircle className="size-3.5 shrink-0 text-accent-strong" weight="fill" />
          </div>
        ))
      )}
    </Card>
  );
}
