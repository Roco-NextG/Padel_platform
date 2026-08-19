"use client";

import { useRouter } from "next/navigation";
import { ChoiceGroup } from "@/components/ui/choice-group";
import type { CategorySummary } from "../infrastructure/tournamentRepository";

/** Cápsula deslizante para elegir categoría — navega por ?category=, la página sigue siendo server-rendered por categoría (mismo criterio que el resto de la app). */
export function CategorySwitch({
  categories,
  selectedId,
}: {
  categories: CategorySummary[];
  selectedId: string;
}) {
  const router = useRouter();

  if (categories.length < 2) return null;

  return (
    <ChoiceGroup
      name="category"
      defaultValue={selectedId}
      onChange={(value) => router.push(`?category=${value}`, { scroll: false })}
      options={categories.map((c) => ({ value: c.id, label: c.name }))}
    />
  );
}
