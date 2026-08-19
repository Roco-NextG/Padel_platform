"use client";

import { Check } from "@phosphor-icons/react";
import { useScrollStepper } from "@/hooks/useScrollStepper";
import { cn } from "@/lib/utils";
import { phaseTypeLabel } from "../domain/bracket";
import { BracketRoundColumn } from "./bracket-round-column";
import { GroupStandingsTable } from "./group-standings-table";
import { BracketView } from "./bracket-view";
import type { BracketDisplayRound } from "../infrastructure/tournamentRepository";
import type { GroupStandingsView } from "../application/getGroupStandings";

interface Phase {
  label: string;
  content: React.ReactNode;
}

/**
 * Scroll horizontal real + reveal progresivo entre fases (Grupos → Cuartos →
 * Semis → Final), sincronizado con el stepper de arriba — mismo hook y misma
 * mecánica que el wizard de Crear Torneo (useScrollStepper), no un
 * IntersectionObserver nuevo (11_UX_HANDOFF.md §1, §3.2).
 *
 * El número de fases es dinámico: se arma a partir de `rounds.length` (una
 * fase por ronda que el engine realmente generó, nunca 4 fijas) más "Grupos"
 * solo si esta categoría usa fase de grupos.
 */
export function TournamentPhaseFlow({
  groupStandings,
  rounds,
}: {
  groupStandings: GroupStandingsView[];
  rounds: BracketDisplayRound[];
}) {
  const phases: Phase[] = [];

  if (groupStandings.length > 0) {
    phases.push({
      label: "Grupos",
      content: (
        <div className="grid gap-5 sm:grid-cols-2">
          {groupStandings.map((g) => (
            <GroupStandingsTable key={g.groupId} group={g} />
          ))}
        </div>
      ),
    });
  }

  for (const round of rounds) {
    phases.push({ label: phaseTypeLabel(round.type), content: <BracketRoundColumn round={round} /> });
  }

  const { containerRef, registerStep, activeStep, scrollToStep } = useScrollStepper(phases.length);

  if (phases.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      {phases.length > 1 && (
        <nav className="flex items-center gap-1 self-start rounded-full border border-border bg-surface-secondary p-1">
          {phases.map((phase, i) => (
            <button
              key={phase.label}
              type="button"
              onClick={() => scrollToStep(i)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                i === activeStep ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full text-[9px]",
                  i < activeStep
                    ? "bg-accent text-accent-foreground"
                    : i === activeStep
                      ? "bg-inverse text-inverse-foreground"
                      : "bg-surface"
                )}
              >
                {i < activeStep ? <Check className="size-2.5" weight="bold" /> : i + 1}
              </span>
              {phase.label}
            </button>
          ))}
        </nav>
      )}

      <div ref={containerRef} className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth">
        {phases.map((phase, i) => (
          <section key={phase.label} ref={registerStep(i)} className="w-full shrink-0 snap-start px-0.5">
            {phase.content}
          </section>
        ))}
      </div>

      {rounds.length > 1 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-muted-foreground">Ver cuadro completo</summary>
          <div className="mt-3">
            <BracketView rounds={rounds} />
          </div>
        </details>
      )}
    </div>
  );
}
