"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MatchCard } from "./match-card";
import type { MatchWithContext } from "../domain/match";
import type { CourtOption } from "../infrastructure/matchRepository";

type FilterKey = "todos" | "live" | "upcoming" | "paused" | "cancelled";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "live", label: "En vivo" },
  { key: "upcoming", label: "Próximos" },
  { key: "paused", label: "Pausados" },
  { key: "cancelled", label: "Cancelados" },
];

function matchesFilter(match: MatchWithContext, filter: FilterKey): boolean {
  switch (filter) {
    case "todos":
      return true;
    case "live":
      return match.status === "IN_PROGRESS" && !match.isPaused;
    case "upcoming":
      return match.status === "SCHEDULED";
    case "paused":
      return match.status === "IN_PROGRESS" && match.isPaused;
    case "cancelled":
      return match.status === "CANCELLED";
  }
}

/**
 * Filtro de estado (padel-platform.html #status-filter) — un useState simple
 * sobre un array de botones, NO useScrollStepper: son toggles de filtro sin
 * scroll horizontal ni noción de "paso actual/fase", a diferencia del
 * stepper de fases de Torneo/bracket (tournament-phase-flow.tsx) — así que
 * no hay riesgo de reintroducir ese bug de reset acá.
 */
export function MatchLiveGrid({
  matches,
  courtsByClub,
}: {
  matches: MatchWithContext[];
  courtsByClub: Record<string, CourtOption[]>;
}) {
  const [filter, setFilter] = useState<FilterKey>("todos");
  const visible = matches.filter((m) => matchesFilter(m, filter));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-1 self-start overflow-x-auto rounded-full border border-border bg-surface-secondary p-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.key ? "bg-inverse text-inverse-foreground" : "text-muted-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No hay partidos en este filtro.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-3">
          {visible.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              courts={(match.clubId && courtsByClub[match.clubId]) || []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
