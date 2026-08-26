"use client";

import { useMemo, useRef, useState } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils";
import { GroupStandings } from "./group-standings";
import { BracketColumn } from "./bracket-view";
import type { BracketRoundView } from "../domain/bracket";
import type { GroupStandingsView } from "../infrastructure/bracketRepository";
import type { PhaseType } from "@/lib/supabase/database.types";

/** Etiqueta corta para el phase-nav — .phase-btn en el mockup usa "Grupos"/"Cuartos"/"Semis"/"Final", más corto que phaseLabel() ("Cuartos de final", etc.) que se usa para el encabezado de cada sección. */
const NAV_SHORT_LABEL: Record<PhaseType, string> = {
  GROUPS: "Grupos",
  ROUND_OF_32: "Dieciseisavos",
  ROUND_OF_16: "Octavos",
  QUARTERFINAL: "Cuartos",
  SEMIFINAL: "Semis",
  FINAL: "Final",
  CONSOLATION: "Consolación",
};

const SECTION_HEADING: Record<PhaseType, string> = {
  GROUPS: "Fase de grupos",
  ROUND_OF_32: "Dieciseisavos de final",
  ROUND_OF_16: "Octavos de final",
  QUARTERFINAL: "Cuartos de final",
  SEMIFINAL: "Semifinal",
  FINAL: "Final",
  CONSOLATION: "Consolación",
};

interface Section {
  id: string;
  navLabel: string;
  heading: string;
  watermark: string;
  speed: number;
  content: React.ReactNode;
}

function buildSections(groups: GroupStandingsView[], bracket: BracketRoundView[], tournamentId: string): Section[] {
  const list: Section[] = [];
  if (groups.length > 0) {
    // Editable (drag & drop entre grupos) solo si NINGÚN equipo tiene partidos jugados todavía en NINGÚN grupo — mover parejas después invalidaría estadísticas ya calculadas (misma regla dura reforzada en swapGroupTeams).
    const groupsEditable = groups.every((g) => g.standings.every((s) => s.matchesPlayed === 0));
    list.push({
      id: "phase-groups",
      navLabel: NAV_SHORT_LABEL.GROUPS,
      heading: SECTION_HEADING.GROUPS,
      watermark: NAV_SHORT_LABEL.GROUPS.toUpperCase(),
      speed: 0.5,
      content: <GroupStandings groups={groups} editable={groupsEditable} tournamentId={tournamentId} />,
    });
  }
  bracket.forEach((round, i) => {
    // Editable (drag & drop de emparejamientos) solo la PRIMERA fase generada del cuadro, y solo si ninguno de sus partidos empezó todavía.
    const isFirstRound = i === 0;
    const roundEditable = isFirstRound && round.matches.every((m) => m.status === "SCHEDULED");
    list.push({
      id: `phase-${round.phaseId}`,
      navLabel: NAV_SHORT_LABEL[round.type],
      heading: SECTION_HEADING[round.type],
      watermark: NAV_SHORT_LABEL[round.type].toUpperCase(),
      speed: Math.max(0.5 - i * 0.12, 0.15),
      content: <BracketColumn round={round} editable={roundEditable} tournamentId={tournamentId} />,
    });
  });
  return list;
}

export function PhaseFlow({ groups, bracket, tournamentId }: { groups: GroupStandingsView[]; bracket: BracketRoundView[]; tournamentId: string }) {
  const flowRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const { scrollX } = useScroll({ container: flowRef });

  const sections: Section[] = useMemo(() => buildSections(groups, bracket, tournamentId), [groups, bracket, tournamentId]);
  const [activeId, setActiveId] = useState<string | null>(() => sections[0]?.id ?? null);

  /**
   * La pestaña "activa" se fija solo al hacer click, no se re-deriva del
   * scroll: cada columna de ronda es angosta (236px) frente al ancho de
   * pantalla pensado para proyector, así que en la práctica varias fases
   * quedan visibles a la vez (Octavos+Cuartos+Semis+Final entran juntas en
   * una pantalla grande) — no hay una única "fase en pantalla" que
   * derivar del scroll sin ambigüedad. El phase-nav funciona como salto
   * rápido, no como indicador continuo de posición.
   */

  /**
   * Con scroll-snap-type activo, tanto scrollIntoView como scrollTo({behavior:'smooth'})
   * pueden ser interrumpidos a mitad de la animación por el propio motor de
   * snap del navegador, dejando el scroll a medio camino en vez de llegar
   * al target (confirmado en vivo: se quedaba pegado ~50-100px después del
   * inicio). Se apaga el snap justo antes de animar y se restaura al
   * terminar — el snap solo importa para el scroll libre del usuario, no
   * para esta navegación programática.
   */
  function scrollToSection(id: string) {
    setActiveId(id);
    const el = sectionRefs.current.get(id);
    const container = flowRef.current;
    if (!el || !container) return;
    container.style.scrollSnapType = "none";
    const restoreSnap = () => {
      container.style.scrollSnapType = "";
    };
    // scrollend es el momento real en que termina la animación — un
    // setTimeout fijo puede disparar ANTES de que el smooth scroll termine
    // (confirmado en vivo: 600ms no alcanzaba para la distancia más larga,
    // el snap se reactivaba a mitad de camino y frenaba el scroll ahí).
    container.addEventListener("scrollend", restoreSnap, { once: true });
    window.setTimeout(restoreSnap, 1200);
    container.scrollTo({ left: el.offsetLeft, behavior: "smooth" });
  }

  if (sections.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <nav className="sticky top-2 z-10 mx-auto flex w-fit gap-1 rounded-full border border-border-strong bg-surface/95 p-1 shadow-sm backdrop-blur-sm">
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => scrollToSection(s.id)}
            className="relative rounded-full px-3.5 py-1.5 text-xs font-medium"
          >
            {activeId === s.id && (
              <motion.span
                layoutId="phase-nav-pill"
                className="absolute inset-0 rounded-full bg-foreground"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className={cn("relative z-10 transition-colors", activeId === s.id ? "text-background" : "text-muted-foreground")}>
              {s.navLabel}
            </span>
          </button>
        ))}
      </nav>

      <div ref={flowRef} className="flex snap-x snap-proximity items-start gap-10 overflow-x-auto pb-6 [scrollbar-width:thin]">
        {sections.map((s, i) => (
          <div key={s.id} className="flex shrink-0 items-center gap-10">
            {i > 0 && <PhaseConnector />}
            <PhaseSection
              id={s.id}
              heading={s.heading}
              watermark={s.watermark}
              speed={s.speed}
              scrollX={scrollX}
              registerRef={(el) => {
                if (el) sectionRefs.current.set(s.id, el);
                else sectionRefs.current.delete(s.id);
              }}
            >
              {s.content}
            </PhaseSection>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhaseSection({
  id,
  heading,
  watermark,
  speed,
  scrollX,
  registerRef,
  children,
}: {
  id: string;
  heading: string;
  watermark: string;
  speed: number;
  scrollX: MotionValue<number>;
  registerRef: (el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}) {
  const x = useTransform(scrollX, (v) => -v * speed * 0.15);
  return (
    <div id={id} ref={registerRef} data-phase-section className="relative snap-start pt-3">
      <motion.span
        aria-hidden="true"
        style={{ x }}
        className="pointer-events-none absolute -top-1 left-0 select-none whitespace-nowrap text-[76px] font-semibold leading-none tracking-tighter text-foreground opacity-[0.035]"
      >
        {watermark}
      </motion.span>
      <div className="relative z-[1] flex flex-col gap-3">
        <h2 className="font-display text-[19px] font-medium tracking-tight text-foreground">{heading}</h2>
        {children}
      </div>
    </div>
  );
}

/** Flecha SVG animada entre fases — misma idea que .connector/.flow-dash del mockup (marching ants), respetando prefers-reduced-motion vía la clase .connector-dash definida en globals.css. */
function PhaseConnector() {
  return (
    <div className="flex w-[70px] shrink-0 items-center justify-center self-center" aria-hidden="true">
      <svg width="60" height="34" viewBox="0 0 60 34" className="overflow-visible">
        <path d="M4 17 H56 M50 11 L56 17 L50 23" stroke="var(--border-strong)" strokeWidth="1.5" fill="none" />
        <path d="M4 17 H56 M50 11 L56 17 L50 23" className="connector-dash" fill="none" />
      </svg>
    </div>
  );
}
