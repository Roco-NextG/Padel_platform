"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarBlank } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { MatchCard } from "./match-card";
import { matchDisplayStatus, MATCH_DISPLAY_STATUS_ORDER, type MatchDisplayStatus, type MatchListItem } from "../domain/match";

type FilterKey = "TODOS" | "LIVE" | "UPCOMING" | "PAUSED" | "DONE" | "CANCELLED";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "TODOS", label: "Todos" },
  { key: "LIVE", label: "En vivo" },
  { key: "UPCOMING", label: "Próximos" },
  { key: "PAUSED", label: "Pausados" },
  { key: "DONE", label: "Finalizados" },
  { key: "CANCELLED", label: "Cancelados" },
];

function matchesFilter(displayStatus: MatchDisplayStatus, filter: FilterKey): boolean {
  if (filter === "TODOS") return true;
  return displayStatus === filter;
}

export function MatchList({
  matches: initialMatches,
  courtsByTournamentId,
  showTournamentName,
}: {
  matches: MatchListItem[];
  courtsByTournamentId: Record<string, { id: string; name: string }[]>;
  showTournamentName: boolean;
}) {
  const [matches, setMatches] = useState(initialMatches);
  const [filter, setFilter] = useState<FilterKey>("TODOS");

  const sorted = useMemo(() => {
    return [...matches].sort(
      (a, b) => MATCH_DISPLAY_STATUS_ORDER[matchDisplayStatus(a)] - MATCH_DISPLAY_STATUS_ORDER[matchDisplayStatus(b)]
    );
  }, [matches]);

  const visible = sorted.filter((m) => matchesFilter(matchDisplayStatus(m), filter));

  if (matches.length === 0) {
    return (
      <EmptyState
        icon={CalendarBlank}
        title="No hay partidos pendientes"
        description="Generá el cuadro o la fase de grupos de un torneo para que aparezcan acá."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.key ? "bg-foreground text-background" : "bg-surface-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={CalendarBlank} title="Sin partidos en este filtro" description="Probá con otro estado." />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(272px,1fr))] items-start gap-3">
          <AnimatePresence initial={false}>
            {visible.map((m) => (
              <motion.div key={m.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
                <MatchCard
                  match={m}
                  courts={courtsByTournamentId[m.tournamentId] ?? []}
                  showTournamentName={showTournamentName}
                  onUpdate={(patch) => setMatches((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...patch } : x)))}
                  onConfirmed={() => setMatches((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: "CONFIRMED" } : x)))}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
