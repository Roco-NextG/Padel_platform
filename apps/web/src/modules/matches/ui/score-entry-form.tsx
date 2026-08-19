"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  correctMatchResultAction,
  submitMatchResultAction,
  type MatchActionState,
} from "../application/actions";
import { estimateSetWinner, isSetTiebreak, type MatchWithContext } from "../domain/match";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { cn } from "@/lib/utils";

const initialState: MatchActionState = { error: null, success: false };
const GAME_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7];

function teamLabel(team: MatchWithContext["teamA"]): string {
  return team.players.map((p) => p.firstName).join(" / ") || "Equipo";
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} size="lg" className="w-full sm:w-auto">
      {label}
    </Button>
  );
}

interface SetEntry {
  setNumber: number;
  teamAGames: number | null;
  teamBGames: number | null;
  tiebreakA: number | null;
  tiebreakB: number | null;
}

type Selected = { setNumber: number; side: "A" | "B" } | null;

function DigitStrip({ value, onTap }: { value: number | null; onTap: (value: number) => void }) {
  return (
    <div className="flex gap-1 rounded-lg bg-surface-secondary p-1">
      {GAME_DIGITS.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onTap(d)}
          className={cn(
            "flex h-9 flex-1 items-center justify-center rounded-md font-display text-sm font-semibold transition-colors",
            value === d ? "bg-inverse text-inverse-foreground" : "text-foreground hover:bg-surface"
          )}
        >
          {d}
        </button>
      ))}
    </div>
  );
}

function ScoreCellRow({
  label,
  value,
  isWinning,
  isSelected,
  onClick,
}: {
  label: string;
  value: number | null;
  isWinning: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors",
        isSelected ? "bg-accent-muted" : "hover:bg-surface-secondary"
      )}
    >
      <span className={cn("truncate text-sm", isWinning ? "font-semibold text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
      <span
        className={cn(
          "font-display text-xl font-semibold tabular-nums",
          isWinning ? "text-accent-text" : "text-foreground"
        )}
      >
        {value ?? "–"}
      </span>
    </button>
  );
}

/**
 * Set "de juegos" normal: teclado de dígitos (0-7, sin flechas, tap para
 * elegir) para las casillas de games — cubre exactamente el rango válido de
 * games por set (0..gamesPerSet+1), a diferencia de los puntos de tie-break,
 * que no tienen tope fijo y por eso siguen siendo un input numérico chico
 * (redesign/partidos-vivo §3: "no hace falta tocar el Match Engine para
 * esto", el teclado es solo cómo se arma el input, no cambia lo que se
 * valida).
 */
function GamesSetRow({
  set,
  labelA,
  labelB,
  isOptional,
  selected,
  onSelectCell,
  onTapDigit,
  onTiebreakChange,
}: {
  set: SetEntry;
  labelA: string;
  labelB: string;
  isOptional: boolean;
  selected: Selected;
  onSelectCell: (side: "A" | "B") => void;
  onTapDigit: (side: "A" | "B", value: number) => void;
  onTiebreakChange: (patch: Partial<SetEntry>) => void;
}) {
  const winner =
    set.teamAGames != null && set.teamBGames != null ? estimateSetWinner(set.teamAGames, set.teamBGames) : null;
  const showTiebreak =
    set.teamAGames != null && set.teamBGames != null && isSetTiebreak(set.teamAGames, set.teamBGames);
  const isThisSetSelected = selected?.setNumber === set.setNumber;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
      <span className="text-xs font-medium text-muted-foreground">
        Set {set.setNumber}
        {isOptional && " (opcional)"}
      </span>
      <ScoreCellRow
        label={labelA}
        value={set.teamAGames}
        isWinning={winner === "A"}
        isSelected={isThisSetSelected && selected?.side === "A"}
        onClick={() => onSelectCell("A")}
      />
      <ScoreCellRow
        label={labelB}
        value={set.teamBGames}
        isWinning={winner === "B"}
        isSelected={isThisSetSelected && selected?.side === "B"}
        onClick={() => onSelectCell("B")}
      />

      {isThisSetSelected && (
        <DigitStrip
          value={selected!.side === "A" ? set.teamAGames : set.teamBGames}
          onTap={(value) => onTapDigit(selected!.side, value)}
        />
      )}

      {showTiebreak && (
        <div className="mt-1 flex items-center gap-2 border-t border-border pt-2">
          <span className="text-xs text-muted-foreground">Tie-break</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={set.tiebreakA ?? ""}
            onChange={(e) =>
              onTiebreakChange({ tiebreakA: e.target.value === "" ? null : Number(e.target.value) })
            }
            className="w-14 text-center text-sm"
            aria-label={`Puntos de tie-break de ${labelA}`}
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={set.tiebreakB ?? ""}
            onChange={(e) =>
              onTiebreakChange({ tiebreakB: e.target.value === "" ? null : Number(e.target.value) })
            }
            className="w-14 text-center text-sm"
            aria-label={`Puntos de tie-break de ${labelB}`}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Set decisivo jugado como super tie-break (ScoringConfig.finalSetMode ===
 * "SUPER_TIEBREAK"): los puntos no tienen el rango fijo 0-7 de un set
 * normal (validateSuperTiebreakSet, típicamente a 10 y por 2), así que va
 * con inputs numéricos en vez del teclado — los games simbólicos (1-0) que
 * espera el Match Engine se derivan solos de quién tiene más puntos.
 */
function SuperTiebreakRow({
  set,
  labelA,
  labelB,
  onChange,
}: {
  set: SetEntry;
  labelA: string;
  labelB: string;
  onChange: (patch: Partial<SetEntry>) => void;
}) {
  const leading =
    set.tiebreakA != null && set.tiebreakB != null && set.tiebreakA !== set.tiebreakB
      ? set.tiebreakA > set.tiebreakB
        ? "A"
        : "B"
      : null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <span className="text-xs font-medium text-muted-foreground">
        Set {set.setNumber} · Super tie-break (decisivo)
      </span>
      <div className="flex items-center gap-2">
        <span className={cn("flex-1 truncate text-sm", leading === "A" ? "font-semibold text-foreground" : "text-muted-foreground")}>
          {labelA}
        </span>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={set.tiebreakA ?? ""}
          onChange={(e) => onChange({ tiebreakA: e.target.value === "" ? null : Number(e.target.value) })}
          className="w-16 text-center font-display text-lg"
          aria-label={`Puntos de super tie-break de ${labelA}`}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("flex-1 truncate text-sm", leading === "B" ? "font-semibold text-foreground" : "text-muted-foreground")}>
          {labelB}
        </span>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={set.tiebreakB ?? ""}
          onChange={(e) => onChange({ tiebreakB: e.target.value === "" ? null : Number(e.target.value) })}
          className="w-16 text-center font-display text-lg"
          aria-label={`Puntos de super tie-break de ${labelB}`}
        />
      </div>
    </div>
  );
}

function resolveHiddenSet(
  set: SetEntry,
  isSuperTiebreakSet: boolean
): { teamAGames: number; teamBGames: number; tiebreakA: number | null; tiebreakB: number | null } | null {
  if (isSuperTiebreakSet) {
    if (set.tiebreakA == null || set.tiebreakB == null || set.tiebreakA === set.tiebreakB) return null;
    return {
      teamAGames: set.tiebreakA > set.tiebreakB ? 1 : 0,
      teamBGames: set.tiebreakA > set.tiebreakB ? 0 : 1,
      tiebreakA: set.tiebreakA,
      tiebreakB: set.tiebreakB,
    };
  }
  if (set.teamAGames == null || set.teamBGames == null) return null;
  const needsTiebreak = isSetTiebreak(set.teamAGames, set.teamBGames);
  if (needsTiebreak && (set.tiebreakA == null || set.tiebreakB == null)) return null;
  return {
    teamAGames: set.teamAGames,
    teamBGames: set.teamBGames,
    tiebreakA: needsTiebreak ? set.tiebreakA : null,
    tiebreakB: needsTiebreak ? set.tiebreakB : null,
  };
}

/**
 * Un mismo formulario para registrar y corregir (docs/05_RATING_ENGINE.md §8)
 * — la corrección no necesita su propio formulario, solo otra action y los
 * sets/ganador actuales pre-cargados en vez de vacíos.
 *
 * El teclado numérico (redesign/partidos-vivo §3) es solo cómo se arma el
 * input: el estado local de `sets` se serializa a los mismos inputs ocultos
 * `set{n}_teamA/_teamB/_tbA/_tbB` que ya leía parseSetsFromForm — la action
 * que efectivamente valida y guarda (submitMatchResultAction /
 * correctMatchResultAction, y validateMatchResult dentro de ellas) no cambió.
 */
export function ScoreEntryForm({
  match,
  asOrganizer,
  mode = "submit",
}: {
  match: MatchWithContext;
  asOrganizer: boolean;
  mode?: "submit" | "correct";
}) {
  const action =
    mode === "correct"
      ? correctMatchResultAction.bind(null, match.id)
      : submitMatchResultAction.bind(null, match.id, asOrganizer);
  const [state, formAction] = useActionState(action, initialState);

  const labelA = teamLabel(match.teamA);
  const labelB = teamLabel(match.teamB);
  const maxSets = match.scoringConfig.setsToWin * 2 - 1;
  const isSuperTiebreakFinal = match.scoringConfig.finalSetMode === "SUPER_TIEBREAK";
  const currentWinner =
    mode === "correct" && match.winnerTeamId
      ? match.winnerTeamId === match.teamA.teamId
        ? "A"
        : match.winnerTeamId === match.teamB.teamId
          ? "B"
          : undefined
      : undefined;

  const [sets, setSets] = useState<SetEntry[]>(() =>
    Array.from({ length: maxSets }, (_, i) => {
      const setNumber = i + 1;
      const existing = mode === "correct" ? match.sets.find((s) => s.setNumber === setNumber) : undefined;
      return {
        setNumber,
        teamAGames: existing?.teamAGames ?? null,
        teamBGames: existing?.teamBGames ?? null,
        tiebreakA: existing?.tiebreakA ?? null,
        tiebreakB: existing?.tiebreakB ?? null,
      };
    })
  );
  const [selected, setSelected] = useState<Selected>({ setNumber: 1, side: "A" });

  function updateSet(setNumber: number, patch: Partial<SetEntry>) {
    setSets((prev) => prev.map((s) => (s.setNumber === setNumber ? { ...s, ...patch } : s)));
  }

  function tapDigit(setNumber: number, side: "A" | "B", value: number) {
    updateSet(setNumber, side === "A" ? { teamAGames: value } : { teamBGames: value });
    if (side === "A") setSelected({ setNumber, side: "B" });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && (
        <Alert tone="success">
          {mode === "correct" ? "Resultado corregido." : "Resultado registrado."}
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        {sets.map((set) => {
          const isFinalSet = set.setNumber === maxSets;
          if (isFinalSet && isSuperTiebreakFinal) {
            return (
              <SuperTiebreakRow
                key={set.setNumber}
                set={set}
                labelA={labelA}
                labelB={labelB}
                onChange={(patch) => updateSet(set.setNumber, patch)}
              />
            );
          }
          return (
            <GamesSetRow
              key={set.setNumber}
              set={set}
              labelA={labelA}
              labelB={labelB}
              isOptional={set.setNumber > 1}
              selected={selected}
              onSelectCell={(side) => setSelected({ setNumber: set.setNumber, side })}
              onTapDigit={(side, value) => tapDigit(set.setNumber, side, value)}
              onTiebreakChange={(patch) => updateSet(set.setNumber, patch)}
            />
          );
        })}
      </div>

      {sets.map((set) => {
        const resolved = resolveHiddenSet(set, set.setNumber === maxSets && isSuperTiebreakFinal);
        if (!resolved) return null;
        return (
          <span key={set.setNumber}>
            <input type="hidden" name={`set${set.setNumber}_teamA`} value={resolved.teamAGames} />
            <input type="hidden" name={`set${set.setNumber}_teamB`} value={resolved.teamBGames} />
            {resolved.tiebreakA != null && (
              <input type="hidden" name={`set${set.setNumber}_tbA`} value={resolved.tiebreakA} />
            )}
            {resolved.tiebreakB != null && (
              <input type="hidden" name={`set${set.setNumber}_tbB`} value={resolved.tiebreakB} />
            )}
          </span>
        );
      })}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Ganador</span>
        <ChoiceGroup
          name="winner"
          defaultValue={currentWinner}
          options={[
            { value: "A", label: labelA },
            { value: "B", label: labelB },
          ]}
        />
      </div>

      <div>
        <SubmitButton label={mode === "correct" ? "Guardar corrección" : "Registrar resultado"} />
      </div>
    </form>
  );
}
