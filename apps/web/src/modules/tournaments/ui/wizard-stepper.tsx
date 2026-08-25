"use client";

import { motion } from "motion/react";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { WIZARD_STEP_LABELS, type WizardStepId } from "../domain/tournament";

export function WizardStepper({
  stepIds,
  doneMap,
  activeIndex,
  onSelect,
}: {
  stepIds: WizardStepId[];
  doneMap: Record<WizardStepId, boolean>;
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="glass sticky top-3 z-10 flex w-fit items-center gap-1 self-center rounded-full p-1.5 shadow-md">
      {stepIds.map((id, i) => {
        const active = i === activeIndex;
        const done = doneMap[id] && !active;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(i)}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="relative flex size-5 items-center justify-center">
              {active && (
                <motion.span
                  layoutId="wizard-step-active"
                  className="absolute inset-0 rounded-full bg-inverse"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span
                className={cn(
                  "relative flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
                  active
                    ? "text-inverse-foreground"
                    : done
                      ? "bg-accent text-accent-foreground"
                      : "bg-surface-secondary text-muted-foreground"
                )}
              >
                {done ? <Check className="size-3" weight="bold" /> : i + 1}
              </span>
            </span>
            <span className="hidden sm:inline">{WIZARD_STEP_LABELS[id]}</span>
          </button>
        );
      })}
    </div>
  );
}
