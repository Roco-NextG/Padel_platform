"use client";

import { useState, useTransition } from "react";
import { Play, MapPin } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { setMatchCourtAction, startMatchAction } from "../application/matchActions";
import { ScoreEntryForm } from "./score-entry-form";
import { matchStatusLabel, matchTeamLabel, type MatchListItem } from "../domain/match";

const STATUS_TONE: Record<string, "neutral" | "accent" | "warning" | "destructive"> = {
  SCHEDULED: "neutral",
  IN_PROGRESS: "accent",
  PENDING_CONFIRMATION: "warning",
  DISPUTED: "destructive",
};

export function MatchCard({
  match,
  courts,
  showTournamentName,
  onConfirmed,
}: {
  match: MatchListItem;
  courts: { id: string; name: string }[];
  showTournamentName: boolean;
  onConfirmed: () => void;
}) {
  const [status, setStatus] = useState(match.status);
  const [courtId, setCourtId] = useState(match.courtId);
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleStart() {
    startTransition(async () => {
      const result = await startMatchAction(match.tournamentId, match.id);
      if (!result.error) setStatus("IN_PROGRESS");
    });
  }

  function handleCourtChange(value: string) {
    const newCourtId = value || null;
    setCourtId(newCourtId);
    startTransition(async () => {
      await setMatchCourtAction(match.tournamentId, match.id, newCourtId);
    });
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          {showTournamentName && <span className="text-xs text-muted-foreground">{match.tournamentName}</span>}
          <span className="text-xs text-muted-foreground">
            {match.categoryName}
            {match.groupName ? ` · ${match.groupName}` : ""} · {match.phaseLabel}
          </span>
        </div>
        <Badge tone={STATUS_TONE[status] ?? "neutral"}>{matchStatusLabel(status)}</Badge>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{matchTeamLabel(match.teamA)}</span>
        <span className="text-xs text-muted-foreground">vs</span>
        <span className="text-sm font-medium text-foreground">{matchTeamLabel(match.teamB)}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {courts.length > 0 && (
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-muted-foreground" />
            <Select value={courtId ?? ""} onChange={(e) => handleCourtChange(e.target.value)} disabled={isPending} className="h-8 w-36 text-xs">
              <option value="">Sin pista</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {status === "SCHEDULED" && (
          <Button type="button" variant="secondary" size="sm" loading={isPending} onClick={handleStart} className="gap-1.5">
            <Play className="size-3.5" />
            Iniciar
          </Button>
        )}

        {(status === "SCHEDULED" || status === "IN_PROGRESS") && (
          <Button type="button" size="sm" onClick={() => setShowScoreForm((v) => !v)}>
            {showScoreForm ? "Ocultar marcador" : "Cargar resultado"}
          </Button>
        )}
      </div>

      {showScoreForm && (
        <ScoreEntryForm
          tournamentId={match.tournamentId}
          matchId={match.id}
          scoringConfig={match.scoringConfig}
          teamALabel={matchTeamLabel(match.teamA)}
          teamBLabel={matchTeamLabel(match.teamB)}
          onSubmitted={onConfirmed}
        />
      )}
    </Card>
  );
}
