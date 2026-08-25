"use client";

import { useId, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Plus } from "@phosphor-icons/react";
import { validateMatchResult, type SetScoreInput } from "@padel-platform/match-engine";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { submitMatchResultAction } from "../application/matchActions";
import { matchTeamShortLabel, type MatchTeamView, type ScoringConfig } from "../domain/match";

function setWinner(a: number, b: number): "A" | "B" | null {
  if (a === 7 && b <= 6) return "A";
  if (b === 7 && a <= 6) return "B";
  if (a >= 6 && a - b >= 2) return "A";
  if (b >= 6 && b - a >= 2) return "B";
  return null;
}
function isTiebreakShapeSet(a: number, b: number): boolean {
  return (a === 7 && b === 6) || (b === 7 && a === 6);
}
function emptySet(setNumber: number): SetScoreInput {
  return { setNumber, teamAGames: 0, teamBGames: 0, tiebreakA: null, tiebreakB: null };
}

interface Selected {
  index: number;
  side: "A" | "B";
}

export function MatchScoreboard({
  tournamentId,
  matchId,
  teamA,
  teamB,
  scoringConfig,
  editable,
  onConfirmed,
}: {
  tournamentId: string;
  matchId: string;
  teamA: MatchTeamView | null;
  teamB: MatchTeamView | null;
  scoringConfig: ScoringConfig;
  editable: boolean;
  onConfirmed: () => void;
}) {
  const digitStripId = useId();
  const maxSets = scoringConfig.setsToWin * 2 - 1;
  const decisiveIndex = scoringConfig.finalSetMode === "SUPER_TIEBREAK" ? maxSets - 1 : -1;

  const [sets, setSets] = useState<SetScoreInput[]>([emptySet(1)]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const setsWon = sets.reduce(
    (acc, s, i) => {
      // El set decisivo por super tiebreak guarda 1/0 simbólico en
      // teamAGames/teamBGames (validateSuperTiebreakSet) — setWinner() asume
      // marcador de games real, así que para ESE set el ganador sale de
      // comparar los puntos del tiebreak, no de los games.
      const w =
        i === decisiveIndex
          ? (s.tiebreakA ?? 0) === (s.tiebreakB ?? 0)
            ? null
            : (s.tiebreakA ?? 0) > (s.tiebreakB ?? 0)
              ? "A"
              : "B"
          : setWinner(s.teamAGames, s.teamBGames);
      if (w === "A") acc.A++;
      if (w === "B") acc.B++;
      return acc;
    },
    { A: 0, B: 0 }
  );

  function openEditorAt(index: number, side: "A" | "B") {
    setEditorOpen(true);
    setSelected({ index, side });
  }

  function handleDigit(value: number) {
    if (!selected) return;
    setSets((prev) =>
      prev.map((s, i) => (i === selected.index ? { ...s, [selected.side === "A" ? "teamAGames" : "teamBGames"]: value } : s))
    );
    if (selected.side === "A") setSelected({ index: selected.index, side: "B" });
  }

  function handleTiebreakInput(side: "A" | "B", value: number) {
    if (!selected) return;
    setSets((prev) =>
      prev.map((s, i) => {
        if (i !== selected.index) return s;
        const next = { ...s, [side === "A" ? "tiebreakA" : "tiebreakB"]: value };
        if (i === decisiveIndex) {
          const tbA = side === "A" ? value : (next.tiebreakA ?? 0);
          const tbB = side === "B" ? value : (next.tiebreakB ?? 0);
          next.teamAGames = tbA > tbB ? 1 : 0;
          next.teamBGames = tbB > tbA ? 1 : 0;
        }
        return next;
      })
    );
  }

  function addSet() {
    if (sets.length >= maxSets) return;
    const nextIndex = sets.length;
    setSets((prev) => [...prev, emptySet(prev.length + 1)]);
    openEditorAt(nextIndex, "A");
  }

  function handleDone() {
    setError(null);
    if (setsWon.A === scoringConfig.setsToWin || setsWon.B === scoringConfig.setsToWin) {
      const winner = setsWon.A === scoringConfig.setsToWin ? "A" : "B";
      const validation = validateMatchResult(sets, scoringConfig, winner);
      if (!validation.valid) {
        setError(validation.errors[0]);
        return;
      }
      startTransition(async () => {
        const result = await submitMatchResultAction(tournamentId, matchId, scoringConfig, sets, winner);
        if (result.error) {
          setError(result.error);
          return;
        }
        onConfirmed();
      });
      return;
    }
    setEditorOpen(false);
  }

  const teamAShort = matchTeamShortLabel(teamA);
  const teamBShort = matchTeamShortLabel(teamB);
  const selectedSet = selected ? sets[selected.index] : null;
  const isSuperTiebreakEditing = selected ? selected.index === decisiveIndex : false;
  const showTiebreakInputs =
    !isSuperTiebreakEditing && selectedSet != null && isTiebreakShapeSet(selectedSet.teamAGames, selectedSet.teamBGames);
  const currentDigitValue = selected && selectedSet ? (selected.side === "A" ? selectedSet.teamAGames : selectedSet.teamBGames) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <ScoreRow
            label={teamAShort}
            players={teamA?.players ?? []}
            sets={sets}
            side="A"
            winning={setsWon.A > setsWon.B}
            editable={editable}
            decisiveIndex={decisiveIndex}
            onSelectCell={(i) => openEditorAt(i, "A")}
          />
          <ScoreRow
            label={teamBShort}
            players={teamB?.players ?? []}
            sets={sets}
            side="B"
            winning={setsWon.B > setsWon.A}
            editable={editable}
            decisiveIndex={decisiveIndex}
            onSelectCell={(i) => openEditorAt(i, "B")}
          />
        </div>
        {editable && sets.length < maxSets && (
          <button
            type="button"
            onClick={addSet}
            aria-label="Agregar set"
            className="flex size-[22px] shrink-0 items-center justify-center self-center rounded-full border border-dashed border-border-strong text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            <Plus className="size-3" weight="bold" />
          </button>
        )}
      </div>

      {editable && (
        <>
          <button
            type="button"
            onClick={() => {
              const opening = !editorOpen;
              setEditorOpen(opening);
              if (opening && !selected) openEditorAt(sets.length - 1, "A");
            }}
            className="self-start text-[11px] font-medium text-muted-foreground underline decoration-transparent underline-offset-2 transition-colors hover:decoration-muted-foreground"
          >
            {editorOpen ? "Ocultar marcador" : "Editar marcador"}
          </button>

          <AnimatePresence initial={false}>
            {editorOpen && selected && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-2 border-t border-border pt-2.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {isSuperTiebreakEditing
                      ? `Super tiebreak · ${selected.side === "A" ? teamAShort : teamBShort}`
                      : `Set ${selected.index + 1} · ${selected.side === "A" ? teamAShort : teamBShort}`}
                  </span>

                  {isSuperTiebreakEditing ? (
                    <div className="flex items-center gap-2">
                      <TiebreakNumberInput value={selectedSet?.tiebreakA ?? 0} onChange={(v) => handleTiebreakInput("A", v)} />
                      <span className="text-xs text-muted-foreground">–</span>
                      <TiebreakNumberInput value={selectedSet?.tiebreakB ?? 0} onChange={(v) => handleTiebreakInput("B", v)} />
                    </div>
                  ) : (
                    <>
                      <DigitStrip stripId={digitStripId} value={currentDigitValue} onSelect={handleDigit} />
                      {showTiebreakInputs && (
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-[10px] text-muted-foreground">Tiebreak</span>
                          <TiebreakNumberInput
                            value={selectedSet?.tiebreakA ?? scoringConfig.tiebreakPoints}
                            onChange={(v) => handleTiebreakInput("A", v)}
                          />
                          <span className="text-xs text-muted-foreground">–</span>
                          <TiebreakNumberInput
                            value={selectedSet?.tiebreakB ?? scoringConfig.tiebreakPoints - 2}
                            onChange={(v) => handleTiebreakInput("B", v)}
                          />
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-[10px] leading-snug text-muted-foreground">Tocá una casilla del marcador para editarla</span>
                    <Button type="button" size="sm" loading={isPending} onClick={handleDone} className="shrink-0 gap-1">
                      <Check className="size-3.5" />
                      Listo
                    </Button>
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function ScoreRow({
  label,
  players,
  sets,
  side,
  winning,
  editable,
  decisiveIndex,
  onSelectCell,
}: {
  label: string;
  players: { playerId: string; firstName: string; lastName: string }[];
  sets: SetScoreInput[];
  side: "A" | "B";
  winning: boolean;
  editable: boolean;
  decisiveIndex: number;
  onSelectCell: (setIndex: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <div className="flex shrink-0">
          {players.slice(0, 2).map((p, i) => (
            <span
              key={p.playerId}
              className={cn(
                "flex size-5 items-center justify-center rounded-full border-2 border-surface bg-surface-secondary text-[8px] font-semibold text-muted-foreground",
                i > 0 && "-ml-2"
              )}
            >
              {p.firstName[0]}
              {p.lastName[0]}
            </span>
          ))}
        </div>
        <span className={cn("truncate text-xs", winning ? "font-semibold text-accent-text" : "font-medium text-foreground")}>{label}</span>
      </div>
      <div className="flex shrink-0 gap-1">
        {sets.map((s, i) => {
          const isDecisive = i === decisiveIndex;
          const value = isDecisive ? (side === "A" ? s.tiebreakA : s.tiebreakB) ?? 0 : side === "A" ? s.teamAGames : s.teamBGames;
          const won = isDecisive
            ? (s.tiebreakA ?? 0) !== (s.tiebreakB ?? 0) && (side === "A") === (s.tiebreakA ?? 0) > (s.tiebreakB ?? 0)
            : setWinner(s.teamAGames, s.teamBGames) === side;
          const tb = !isDecisive && isTiebreakShapeSet(s.teamAGames, s.teamBGames) && value === 7;
          return (
            <button
              key={i}
              type="button"
              disabled={!editable}
              onClick={() => onSelectCell(i)}
              className={cn(
                "relative flex size-[22px] items-center justify-center rounded-md text-xs font-semibold tabular-nums transition-colors",
                won ? "bg-accent-muted text-accent-text" : "bg-surface-secondary text-muted-foreground",
                editable && "cursor-pointer"
              )}
            >
              {value}
              {tb && <sup className="absolute -right-0.5 -top-0.5 text-[6px] font-bold opacity-75">TB</sup>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DigitStrip({ stripId, value, onSelect }: { stripId: string; value: number; onSelect: (value: number) => void }) {
  return (
    <div className="relative flex w-fit gap-[3px] rounded-full border border-border bg-surface-secondary p-[3px]">
      {Array.from({ length: 8 }, (_, n) => n).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onSelect(n)}
          className="relative flex size-[26px] items-center justify-center rounded-full text-[11.5px] font-semibold tabular-nums text-muted-foreground transition-colors"
        >
          {n === value && (
            <motion.span
              layoutId={`digit-highlight-${stripId}`}
              className="absolute inset-0 rounded-full bg-foreground"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <span className={cn("relative z-10", n === value && "text-background")}>{n}</span>
        </button>
      ))}
    </div>
  );
}

function TiebreakNumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-7 w-11 rounded-md border border-border bg-surface px-1 text-center text-xs font-semibold tabular-nums text-foreground focus-visible:border-accent focus-visible:outline-none"
    />
  );
}
