"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X } from "@phosphor-icons/react";
import type { SetScoreInput } from "@padel-platform/match-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitMatchResultAction } from "../application/matchActions";
import type { ScoringConfig } from "../domain/match";

function emptySet(setNumber: number): SetScoreInput {
  return { setNumber, teamAGames: 0, teamBGames: 0, tiebreakA: null, tiebreakB: null };
}

export function ScoreEntryForm({
  tournamentId,
  matchId,
  scoringConfig,
  teamALabel,
  teamBLabel,
  onSubmitted,
}: {
  tournamentId: string;
  matchId: string;
  scoringConfig: ScoringConfig;
  teamALabel: string;
  teamBLabel: string;
  onSubmitted: () => void;
}) {
  const maxSets = scoringConfig.setsToWin * 2 - 1;
  const [sets, setSets] = useState<SetScoreInput[]>([emptySet(1)]);
  const [showTiebreak, setShowTiebreak] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateSet(index: number, patch: Partial<SetScoreInput>) {
    setSets((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSet() {
    if (sets.length >= maxSets) return;
    setSets((prev) => [...prev, emptySet(prev.length + 1)]);
  }

  function removeSet(index: number) {
    setSets((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, setNumber: i + 1 })));
  }

  function handleSubmit() {
    setError(null);
    const setsWonA = sets.filter((s) => s.teamAGames > s.teamBGames).length;
    const setsWonB = sets.length - setsWonA;
    const winner = setsWonA > setsWonB ? "A" : "B";

    startTransition(async () => {
      const result = await submitMatchResultAction(tournamentId, matchId, scoringConfig, sets, winner);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSubmitted();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed border-border-strong p-3">
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground">
        <span />
        <span className="text-center">{teamALabel.split(" / ")[0]}</span>
        <span className="text-center">{teamBLabel.split(" / ")[0]}</span>
        <span className="text-center">TB</span>
        <span />
      </div>

      <AnimatePresence initial={false}>
        {sets.map((set, i) => (
          <motion.div
            key={i}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-2"
          >
            <span className="text-xs font-medium text-muted-foreground">Set {set.setNumber}</span>
            <Input
              type="number"
              min={0}
              value={set.teamAGames}
              onChange={(e) => updateSet(i, { teamAGames: Number(e.target.value) })}
              className="h-9 w-12 px-1 text-center"
            />
            <Input
              type="number"
              min={0}
              value={set.teamBGames}
              onChange={(e) => updateSet(i, { teamBGames: Number(e.target.value) })}
              className="h-9 w-12 px-1 text-center"
            />
            {showTiebreak[i] ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  value={set.tiebreakA ?? ""}
                  onChange={(e) => updateSet(i, { tiebreakA: e.target.value === "" ? null : Number(e.target.value) })}
                  className="h-9 w-10 px-1 text-center"
                />
                <Input
                  type="number"
                  min={0}
                  value={set.tiebreakB ?? ""}
                  onChange={(e) => updateSet(i, { tiebreakB: e.target.value === "" ? null : Number(e.target.value) })}
                  className="h-9 w-10 px-1 text-center"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowTiebreak((prev) => ({ ...prev, [i]: true }))}
                className="text-xs text-accent-text hover:underline"
              >
                +TB
              </button>
            )}
            <button
              type="button"
              onClick={() => removeSet(i)}
              disabled={sets.length === 1}
              className="text-muted-foreground hover:text-destructive disabled:opacity-30"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {sets.length < maxSets && (
        <button type="button" onClick={addSet} className="flex items-center gap-1 self-start text-xs font-medium text-accent-text hover:underline">
          <Plus className="size-3.5" />
          Agregar set
        </button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button type="button" size="sm" loading={isPending} onClick={handleSubmit} className="self-start">
        Confirmar resultado
      </Button>
    </div>
  );
}
