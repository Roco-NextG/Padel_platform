"use client";

import { Check, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useScrollStepper } from "@/hooks/useScrollStepper";
import { cn } from "@/lib/utils";
import type { WizardData } from "../../application/getWizardData";
import { StepDatos } from "./step-datos";
import { StepSponsors } from "./step-sponsors";
import { StepCategorias } from "./step-categorias";
import { StepInscripciones } from "./step-inscripciones";
import { StepPublicar } from "./step-publicar";

const STEPS = ["Datos", "Patrocinadores", "Categorías", "Inscripciones", "Publicar"];

export function TournamentWizard({ data }: { data: WizardData }) {
  const { containerRef, registerStep, activeStep, scrollToStep } = useScrollStepper(STEPS.length);
  const isLastStep = activeStep === STEPS.length - 1;

  return (
    <div className="flex flex-col gap-5">
      <nav className="glass sticky top-3 z-10 flex items-center gap-1 rounded-full p-1.5 shadow-md">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => scrollToStep(i)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-xs font-medium transition-colors",
              i === activeStep ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "flex size-[18px] items-center justify-center rounded-full text-[10px]",
                i < activeStep
                  ? "bg-accent text-accent-foreground"
                  : i === activeStep
                    ? "bg-inverse text-inverse-foreground"
                    : "bg-surface-secondary"
              )}
            >
              {i < activeStep ? <Check className="size-2.5" weight="bold" /> : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </nav>

      <div
        ref={containerRef}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        <section ref={registerStep(0)} className="w-full shrink-0 snap-start px-0.5">
          <StepDatos tournament={data.tournament} />
        </section>
        <section ref={registerStep(1)} className="w-full shrink-0 snap-start px-0.5">
          <StepSponsors tournamentId={data.tournament.id} sponsors={data.sponsors} />
        </section>
        <section ref={registerStep(2)} className="w-full shrink-0 snap-start px-0.5">
          <StepCategorias tournamentId={data.tournament.id} categories={data.categories} teams={data.teams} />
        </section>
        <section ref={registerStep(3)} className="w-full shrink-0 snap-start px-0.5">
          <StepInscripciones
            tournamentId={data.tournament.id}
            categories={data.categories}
            teams={data.teams}
          />
        </section>
        <section ref={registerStep(4)} className="w-full shrink-0 snap-start px-0.5">
          <StepPublicar data={data} />
        </section>
      </div>

      <div className="glass sticky bottom-3 z-10 flex items-center justify-between rounded-full px-4 py-2.5 shadow-lg">
        <span className="text-xs text-muted-foreground">
          Paso {activeStep + 1} de {STEPS.length}
        </span>
        <div className="flex gap-2">
          {activeStep > 0 && (
            <button
              type="button"
              onClick={() => scrollToStep(activeStep - 1)}
              className="flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-foreground hover:bg-surface-secondary"
            >
              <CaretLeft className="size-4" />
              Atrás
            </button>
          )}
          {!isLastStep && (
            <button
              type="button"
              onClick={() => scrollToStep(activeStep + 1)}
              className="flex h-9 items-center gap-1.5 rounded-full bg-accent px-3.5 text-sm font-medium text-accent-foreground hover:brightness-105"
            >
              Siguiente
              <CaretRight className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
