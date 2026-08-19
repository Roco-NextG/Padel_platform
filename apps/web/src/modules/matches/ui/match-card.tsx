import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MatchStatusBadge } from "./match-status-badge";
import { MatchScoreline } from "./match-scoreline";
import { MatchActionsMenu } from "./match-actions-menu";
import type { MatchWithContext } from "../domain/match";
import type { CourtOption } from "../infrastructure/matchRepository";

/**
 * Una card por partido (redesign/partidos-vivo §1) — el Link cubre toda la
 * card (navega al detalle) pero el menú ••• necesita interceptar sus propios
 * clicks sin heredar la navegación: Card queda con pointer-events-none (deja
 * pasar los clicks al Link de abajo) salvo el wrapper del menú, que reactiva
 * pointer-events y se pinta por encima (z-20). El lift de hover sigue
 * funcionando porque :hover en .group se resuelve contra el Link, que vive
 * dentro del mismo contenedor.
 */
export function MatchCard({ match, courts }: { match: MatchWithContext; courts: CourtOption[] }) {
  const labelA = match.teamA.players.map((p) => p.firstName).join(" / ") || "Equipo";
  const labelB = match.teamB.players.map((p) => p.firstName).join(" / ") || "Equipo";

  return (
    <div className="group relative">
      <Link
        href={`/dashboard/partidos/${match.id}`}
        className="absolute inset-0 z-0"
        aria-label={`Ver partido: ${labelA} vs ${labelB}`}
      />
      <Card
        interactive
        className="relative z-10 flex flex-col gap-3 pointer-events-none transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md"
      >
        <div className="flex items-center justify-between gap-2">
          <MatchStatusBadge status={match.status} isPaused={match.isPaused} />
          <div className="pointer-events-auto relative z-20">
            <MatchActionsMenu
              matchId={match.id}
              status={match.status}
              isPaused={match.isPaused}
              courtId={match.courtId}
              courts={courts}
            />
          </div>
        </div>
        <MatchScoreline match={match} />
      </Card>
    </div>
  );
}
