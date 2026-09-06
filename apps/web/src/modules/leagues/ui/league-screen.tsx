"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ListNumbers, CalendarBlank } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { categoryName } from "@/modules/tournaments/domain/category";
import { LeagueProgressCard } from "./league-progress-card";
import { LeagueStandingsTable } from "./league-standings-table";
import { LeagueMatchCard } from "./league-match-card";
import { GenerateLeagueScheduleButton } from "./generate-league-schedule-button";
import { Card } from "@/components/ui/card";
import type { LeagueCategory } from "../domain/leagueCategory";
import type { LeagueStandingsEntry } from "../domain/standings";
import type { LeagueRoundView } from "../infrastructure/leagueStandingsRepository";
import type { LeagueMatchView } from "../infrastructure/leagueScheduleRepository";

export interface LeagueCategoryData {
  category: LeagueCategory;
  standings: LeagueStandingsEntry[];
  rounds: LeagueRoundView[];
  matches: LeagueMatchView[];
  teamCount: number;
}

function formatWindow(round: LeagueRoundView | undefined): string | null {
  if (!round?.windowStart) return null;
  const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("es-VE", { day: "numeric", month: "short" });
  return round.windowEnd && round.windowEnd !== round.windowStart ? `${fmt(round.windowStart)} — ${fmt(round.windowEnd)}` : fmt(round.windowStart);
}

export function LeagueScreen({ leagueId, categoriesData }: { leagueId: string; categoriesData: LeagueCategoryData[] }) {
  const router = useRouter();
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [view, setView] = useState<"tabla" | "jornadas">("tabla");

  const data = categoriesData[categoryIndex];
  const firstUnplayedRound = data?.rounds.find((r) => !r.played);
  const defaultRoundId = firstUnplayedRound?.id ?? data?.rounds[data.rounds.length - 1]?.id ?? null;
  const [roundId, setRoundId] = useState<string | null>(defaultRoundId);

  const selectedRoundId = roundId && data?.rounds.some((r) => r.id === roundId) ? roundId : defaultRoundId;
  const matchesForRound = useMemo(
    () => (data ? data.matches.filter((m) => m.roundId === selectedRoundId) : []),
    [data, selectedRoundId]
  );

  function handleSelectCategory(index: number) {
    setCategoryIndex(index);
    setView("tabla");
    setRoundId(null);
  }

  function handleConfirmed() {
    router.refresh();
  }

  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      {categoriesData.length > 1 && (
        <div className="flex w-fit gap-1 rounded-full border border-border-strong bg-surface p-1">
          {categoriesData.map((d, i) => (
            <button
              key={d.category.id}
              type="button"
              onClick={() => handleSelectCategory(i)}
              className={cn(
                "relative whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                categoryIndex === i ? "text-background" : "text-muted-foreground hover:bg-surface-secondary"
              )}
            >
              {categoryIndex === i && (
                <motion.span layoutId="league-cat-pill" className="absolute inset-0 rounded-full bg-foreground" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              <span className="relative z-10">{categoryName(Number(d.category.level), d.category.genderRestriction as "MALE" | "FEMALE" | "MIXED")}</span>
            </button>
          ))}
        </div>
      )}

      {data.rounds.length > 0 && <LeagueProgressCard rounds={data.rounds} />}

      {data.rounds.length === 0 ? (
        <Card className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {data.teamCount < 2
              ? "Esta categoría necesita al menos 2 parejas inscritas para generar las jornadas."
              : "Todavía no se generaron las jornadas de esta categoría."}
          </p>
          {data.teamCount >= 2 && <GenerateLeagueScheduleButton leagueId={leagueId} categoryId={data.category.id} />}
        </Card>
      ) : (
        <>
          <div className="flex w-fit gap-1 rounded-full border border-border-strong bg-surface p-1">
            <button
              type="button"
              onClick={() => setView("tabla")}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                view === "tabla" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-surface-secondary"
              )}
            >
              <ListNumbers className="size-3.5" />
              Tabla de posiciones
            </button>
            <button
              type="button"
              onClick={() => setView("jornadas")}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                view === "jornadas" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-surface-secondary"
              )}
            >
              <CalendarBlank className="size-3.5" />
              Jornadas
            </button>
          </div>

          {view === "tabla" ? (
            <LeagueStandingsTable entries={data.standings} />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {data.rounds.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRoundId(r.id)}
                    className={cn(
                      "relative shrink-0 rounded-md border px-3 py-1.5 text-left text-xs transition-colors",
                      selectedRoundId === r.id ? "border-foreground bg-foreground text-background" : "border-border-strong bg-surface text-foreground hover:bg-surface-secondary"
                    )}
                  >
                    <span className="block font-medium">Jornada {r.orderIndex + 1}</span>
                    {r.played && (
                      <span
                        className={cn(
                          "absolute right-1.5 top-1.5 size-1.5 rounded-full",
                          selectedRoundId === r.id ? "bg-background" : "bg-accent"
                        )}
                      />
                    )}
                  </button>
                ))}
              </div>
              {formatWindow(data.rounds.find((r) => r.id === selectedRoundId)) && (
                <p className="text-[11px] text-muted-foreground">{formatWindow(data.rounds.find((r) => r.id === selectedRoundId))}</p>
              )}
              <div className="flex flex-col gap-2.5">
                {matchesForRound.map((m) => (
                  <LeagueMatchCard key={m.id} leagueId={leagueId} match={m} onConfirmed={handleConfirmed} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
