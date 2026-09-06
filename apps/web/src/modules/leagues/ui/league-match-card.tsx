"use client";

import { Badge } from "@/components/ui/badge";
import { MatchScoreboard } from "@/modules/matches/ui/match-scoreboard";
import { DEFAULT_SCORING_CONFIG } from "@/modules/matches/domain/match";
import { submitLeagueMatchResultAction } from "../application/leagueMatchActions";
import type { LeagueMatchView } from "../infrastructure/leagueScheduleRepository";
import type { MatchStatus } from "@/lib/supabase/database.types";

const STATUS_META: Record<MatchStatus, { label: string; tone: "accent" | "neutral" | "pause" | "cancel" }> = {
  SCHEDULED: { label: "Sin marcador", tone: "neutral" },
  IN_PROGRESS: { label: "En vivo", tone: "accent" },
  PENDING_CONFIRMATION: { label: "Por confirmar", tone: "pause" },
  CONFIRMED: { label: "Confirmado", tone: "neutral" },
  DISPUTED: { label: "En disputa", tone: "cancel" },
  CANCELLED: { label: "Cancelado", tone: "cancel" },
};

/**
 * Tarjeta de partido de jornada — más liviana que MatchCard (tournaments):
 * una categoría de Liga no tiene asignación de pista/horario ni pausar/
 * reanudar/cancelar todavía, solo cargar el resultado. Reusa
 * MatchScoreboard, el mismo componente de marcador de Torneo, apuntando a
 * submitLeagueMatchResultAction en vez de submitMatchResultAction.
 */
export function LeagueMatchCard({ leagueId, match, onConfirmed }: { leagueId: string; match: LeagueMatchView; onConfirmed: () => void }) {
  const editable = match.status === "SCHEDULED" || match.status === "IN_PROGRESS";
  const meta = STATUS_META[match.status];

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-3.5 shadow-sm">
      <div className="flex items-center justify-end">
        <Badge tone={meta.tone} className="gap-1.5 px-2 py-0.5 text-[10px]">
          {meta.tone === "accent" && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
          {meta.label}
        </Badge>
      </div>
      <MatchScoreboard
        teamA={match.teamA}
        teamB={match.teamB}
        scoringConfig={DEFAULT_SCORING_CONFIG}
        editable={editable}
        initialSets={match.sets}
        onSubmit={(sets, winner) => submitLeagueMatchResultAction(leagueId, match.id, sets, winner)}
        onConfirmed={onConfirmed}
      />
    </div>
  );
}
