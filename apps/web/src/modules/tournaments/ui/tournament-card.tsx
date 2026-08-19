import Link from "next/link";
import { SquaresFour, Users } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TOURNAMENT_CARD_STATUS_LABEL, type TournamentCardStatus } from "../domain/tournament";
import type { TournamentCard as TournamentCardData } from "../application/getTournaments";

const STATUS_TONE: Record<TournamentCardStatus, "neutral" | "pause" | "accent"> = {
  borrador: "neutral",
  configurado: "pause",
  publicado: "accent",
};

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate) return "Sin fechas todavía";
  const start = new Date(startDate).toLocaleDateString("es-VE", { day: "numeric", month: "short" });
  if (!endDate) return start;
  const end = new Date(endDate).toLocaleDateString("es-VE", { day: "numeric", month: "short" });
  return `${start} → ${end}`;
}

export function TournamentCard({ tournament }: { tournament: TournamentCardData }) {
  const hasName = tournament.name.trim().length > 0;
  // Publicado → bracket real. Borrador/Configurado → vuelve al asistente donde se quedó
  // (11_UX_HANDOFF.md §3.6: "el mismo botón se comporta distinto según el estado").
  const href =
    tournament.cardStatus === "publicado"
      ? `/dashboard/torneos/${tournament.id}`
      : `/dashboard/torneos/${tournament.id}/editar`;

  return (
    <Link href={href} className="block">
      <Card interactive>
        <div className="relative mb-3 h-19 rounded-md bg-[radial-gradient(circle_at_20%_20%,var(--color-accent-muted),transparent_60%)] bg-inverse">
          <Badge tone={STATUS_TONE[tournament.cardStatus]} className="absolute top-2 right-2">
            {TOURNAMENT_CARD_STATUS_LABEL[tournament.cardStatus]}
          </Badge>
        </div>

        <p className={cn("text-sm font-semibold", !hasName && "text-foreground-tertiary italic")}>
          {hasName ? tournament.name : "Torneo sin nombre"}
        </p>
        <p className="mt-0.5 text-xs text-foreground-tertiary">
          {formatDateRange(tournament.startDate, tournament.endDate)}
        </p>

        <div className="mt-2.5 flex gap-3.5 border-t border-border pt-2.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <SquaresFour className="size-3 text-foreground-tertiary" />
            {tournament.categoryCount} categorías
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3 text-foreground-tertiary" />
            {tournament.teamCount} parejas
          </span>
        </div>
      </Card>
    </Link>
  );
}
