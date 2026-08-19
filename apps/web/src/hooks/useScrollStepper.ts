"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Scroll horizontal real con scroll-snap, sincronizado a un stepper vía
 * IntersectionObserver — misma técnica en Crear Torneo y (más adelante) en
 * Torneo/bracket (padel-platform.html, 11_UX_HANDOFF.md §1: "vale la pena
 * un solo hook useScrollStepper"). Nunca tabs con display:none — el usuario
 * puede deslizar con el trackpad/mouse wheel igual que en el HTML de
 * referencia, el stepper solo refleja dónde está.
 */
export function useScrollStepper(stepCount: number) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const index = stepRefs.current.indexOf(entry.target as HTMLElement);
            if (index !== -1) setActiveStep(index);
          }
        }
      },
      { root: container, threshold: [0, 0.6, 1] }
    );

    for (const el of stepRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [stepCount]);

  const scrollToStep = useCallback((index: number) => {
    stepRefs.current[index]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, []);

  const registerStep = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      stepRefs.current[index] = el;
    },
    []
  );

  return { containerRef, registerStep, activeStep, scrollToStep };
}
