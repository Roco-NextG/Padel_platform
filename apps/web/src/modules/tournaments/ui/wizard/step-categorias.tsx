"use client";

import { useState, useTransition } from "react";
import type { GenderType } from "@/lib/supabase/database.types";
import { toggleTournamentCategoryAction } from "../../application/wizardActions";
import type { WizardCategory, EnrolledTeam } from "../../infrastructure/tournamentRepository";
import { CATEGORY_LEVELS, GENDER_RESTRICTION_LABEL, type CategoryGenderRestriction } from "../../domain/enrollment";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const GENDERS: CategoryGenderRestriction[] = ["MALE", "FEMALE", "MIXED"];

export function StepCategorias({
  tournamentId,
  categories,
  teams,
}: {
  tournamentId: string;
  categories: WizardCategory[];
  teams: EnrolledTeam[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const categoryByKey = new Map(categories.map((c) => [`${c.level}-${c.genderRestriction}`, c]));
  const enrolledCategoryIds = new Set(teams.map((t) => t.categoryId));

  function toggle(level: number, gender: CategoryGenderRestriction) {
    const existing = categoryByKey.get(`${level}-${gender}`);
    setError(null);
    startTransition(async () => {
      const result = await toggleTournamentCategoryAction(
        tournamentId,
        existing?.id ?? null,
        level,
        gender as GenderType
      );
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Categorías</h2>
        <p className="text-sm text-muted-foreground">
          Nivel y rama determinan en qué puede inscribirse cada pareja.
        </p>
      </div>

      <Card className="flex flex-col gap-5">
        {error && <Alert tone="error">{error}</Alert>}

        {GENDERS.map((gender) => (
          <div key={gender} className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">{GENDER_RESTRICTION_LABEL[gender]}</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_LEVELS.map((level) => {
                const existing = categoryByKey.get(`${level}-${gender}`);
                const isActive = Boolean(existing);
                const isLocked = existing ? enrolledCategoryIds.has(existing.id) : false;
                return (
                  <button
                    key={level}
                    type="button"
                    disabled={isPending || isLocked}
                    title={isLocked ? "Ya tiene parejas inscritas" : undefined}
                    onClick={() => toggle(level, gender)}
                    className={cn(
                      "flex h-9 min-w-11 items-center justify-center rounded-full border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70",
                      isActive
                        ? "border-accent-strong bg-accent-muted text-accent-text"
                        : "border-border-strong text-muted-foreground hover:bg-surface-secondary"
                    )}
                  >
                    {level}.ª
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
