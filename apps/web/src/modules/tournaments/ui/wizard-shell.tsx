"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { CaretLeft, CaretRight, ListChecks } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { WizardStepper } from "./wizard-stepper";
import { WIZARD_STEP_LABELS, type WizardStepId } from "../domain/tournament";

export interface WizardStep {
  id: WizardStepId;
  done: boolean;
  content: React.ReactNode;
}

/**
 * Un paso a la vez, sticky stepper con checkmarks, footer fijo Atrás/
 * Siguiente — calca .stepper/.wizard-flow/.wizard-footer de
 * padel-platform.html (decisión explícita del usuario: flujo real, no un
 * pase visual sobre la página de una sola sección que había antes). A
 * diferencia del mockup, los pasos NO están bloqueados linealmente: el
 * torneo ya existe con datos reales en cualquier paso (a diferencia de un
 * wizard de creación desde cero), así que saltar directo a cualquier paso
 * por el stepper es seguro y más útil que forzar Siguiente/Atrás.
 */
export function TournamentWizard({ steps }: { steps: WizardStep[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const stepIds = steps.map((s) => s.id);
  const doneMap = Object.fromEntries(steps.map((s) => [s.id, s.done])) as Record<WizardStepId, boolean>;
  const isLast = activeIndex === steps.length - 1;

  return (
    <div className="flex flex-col gap-6 pb-24">
      <WizardStepper stepIds={stepIds} doneMap={doneMap} activeIndex={activeIndex} onSelect={setActiveIndex} />

      <AnimatePresence mode="wait">
        <motion.div
          key={steps[activeIndex].id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {steps[activeIndex].content}
        </motion.div>
      </AnimatePresence>

      <div className="fixed inset-x-0 bottom-5 z-20 flex justify-center px-4">
        <div className="glass flex items-center gap-4 rounded-full px-4 py-2.5 shadow-lg">
          <span className="text-xs text-muted-foreground">
            Paso {activeIndex + 1} de {steps.length} · {WIZARD_STEP_LABELS[steps[activeIndex].id]}
          </span>
          {activeIndex > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setActiveIndex((i) => i - 1)} className="gap-1">
              <CaretLeft className="size-3.5" />
              Atrás
            </Button>
          )}
          {isLast ? (
            <Link href="/dashboard/torneos">
              <Button type="button" size="sm" className="gap-1">
                <ListChecks className="size-3.5" />
                Volver a Mis Torneos
              </Button>
            </Link>
          ) : (
            <Button type="button" size="sm" onClick={() => setActiveIndex((i) => i + 1)} className="gap-1">
              Siguiente
              <CaretRight className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
