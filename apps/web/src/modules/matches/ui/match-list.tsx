"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarBlank } from "@phosphor-icons/react";
import { MatchCard } from "./match-card";
import type { MatchListItem } from "../domain/match";

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
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {matches.map((m) => (
          <motion.div
            key={m.id}
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
          >
            <MatchCard
              match={m}
              courts={courtsByTournamentId[m.tournamentId] ?? []}
              showTournamentName={showTournamentName}
              onConfirmed={() => setMatches((prev) => prev.filter((x) => x.id !== m.id))}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
