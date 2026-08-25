"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Check, CircleNotch } from "@phosphor-icons/react";
import { toggleCategoryAction } from "../application/categoryActions";
import { CATEGORY_LEVELS, CATEGORY_GENDERS, type TournamentCategory } from "../domain/category";
import { cn } from "@/lib/utils";

function cellKey(level: number, gender: string): string {
  return `${level}-${gender}`;
}

export function CategoryGrid({
  tournamentId,
  categories: initialCategories,
}: {
  tournamentId: string;
  categories: TournamentCategory[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [error, setError] = useState<string | null>(null);
  const [pendingCell, setPendingCell] = useState<string | null>(null);
  const [usesGroupStage, setUsesGroupStage] = useState(false);
  const [isPending, startTransition] = useTransition();

  const categoryByCell = new Map(categories.map((c) => [cellKey(Number(c.level), c.genderRestriction), c]));

  function handleToggle(level: number, gender: "MALE" | "FEMALE" | "MIXED") {
    const key = cellKey(level, gender);
    const existing = categoryByCell.get(key) ?? null;
    setError(null);
    setPendingCell(key);
    startTransition(async () => {
      const result = await toggleCategoryAction(tournamentId, existing?.id ?? null, level, gender, usesGroupStage);
      setPendingCell(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (existing) {
        setCategories((prev) => prev.filter((c) => c.id !== existing.id));
      } else if (result.createdId) {
        setCategories((prev) => [
          ...prev,
          { id: result.createdId!, tournamentId, name: "", level: String(level), genderRestriction: gender, usesGroupStage },
        ]);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={usesGroupStage}
          onChange={(e) => setUsesGroupStage(e.target.checked)}
          className="size-3.5 accent-accent"
        />
        Las categorías nuevas empiezan con fase de grupos
      </label>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-separate border-spacing-1.5">
          <thead>
            <tr>
              <th className="w-16" />
              {CATEGORY_GENDERS.map((g) => (
                <th key={g.code} className="pb-1 text-xs font-medium text-muted-foreground">
                  {g.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORY_LEVELS.map((level) => (
              <tr key={level}>
                <td className="pr-2 text-right text-sm font-medium text-muted-foreground">Cat. {level}</td>
                {CATEGORY_GENDERS.map((g) => {
                  const key = cellKey(level, g.code);
                  const active = categoryByCell.has(key);
                  const cellPending = isPending && pendingCell === key;
                  return (
                    <td key={g.code}>
                      <motion.button
                        type="button"
                        disabled={isPending}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => handleToggle(level, g.code)}
                        aria-pressed={active}
                        className={cn(
                          "flex h-11 w-full items-center justify-center rounded-md border text-sm font-medium transition-colors duration-150",
                          active
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-border bg-surface text-muted-foreground hover:border-border-strong",
                          isPending && "cursor-wait"
                        )}
                      >
                        {cellPending ? (
                          <CircleNotch className="size-4 animate-spin" weight="bold" />
                        ) : active ? (
                          <Check className="size-4" weight="bold" />
                        ) : (
                          g.short
                        )}
                      </motion.button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <p className="text-xs text-muted-foreground">
        {categories.length === 0
          ? "Todavía no activaste ninguna categoría."
          : `${categories.length} ${categories.length === 1 ? "categoría activa" : "categorías activas"}.`}
      </p>
    </div>
  );
}
