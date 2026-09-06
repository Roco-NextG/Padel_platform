"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ListNumbers, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { GroupStandings } from "./group-standings";
import { GlobalStandingsTable } from "./global-standings-table";
import type { GroupStandingsView } from "../infrastructure/bracketRepository";
import type { GlobalStandingsEntry } from "../domain/bracket";

/**
 * Sección "Fase de grupos" del Cuadro — la tabla por grupo individual
 * (GroupStandings) sigue igual, sin tocar. Se agrega el botón "Ver tabla
 * general" que abre, en un overlay, la lista global de fortaleza entre
 * TODAS las parejas clasificadas (04_TOURNAMENT_ENGINE.md §4.1) — hasta
 * ahora esa lista solo alimentaba el bracket por dentro (balancedSeeding),
 * sin que el organizador pudiera verla.
 */
export function GroupsPhaseContent({
  groups,
  globalStandings,
  editable,
  tournamentId,
}: {
  groups: GroupStandingsView[];
  globalStandings: GlobalStandingsEntry[];
  editable: boolean;
  tournamentId: string;
}) {
  const [showGlobal, setShowGlobal] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <Button type="button" variant="secondary" size="sm" onClick={() => setShowGlobal(true)} className="self-start gap-1.5">
        <ListNumbers className="size-4" />
        Ver tabla general
      </Button>

      <GroupStandings groups={groups} editable={editable} tournamentId={tournamentId} />

      {/*
        Portal a document.body: el contenedor de este componente vive dentro
        de <div className="relative z-[1]"> (PhaseSection, phase-flow.tsx) —
        esa combinación position:relative + z-index establece un stacking
        context propio. position:fixed escapa el recorte de overflow de sus
        ancestros, pero NO escapa el stacking context de uno que declara su
        propio z-index: el modal (fixed, z-50) quedaba pintado adentro de esa
        capa z-[1], por debajo del phase-nav (sticky, z-10) que vive en otra
        rama del árbol — confirmado en vivo, el modal se veía detrás del
        nav. El portal saca el modal del árbol por completo.
      */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showGlobal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
                onClick={() => setShowGlobal(false)}
              >
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold text-foreground">Tabla general</h3>
                      <p className="text-xs text-muted-foreground">
                        Todas las parejas clasificadas, en el mismo orden en que se siembra el cuadro.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGlobal(false)}
                      aria-label="Cerrar"
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-secondary hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="overflow-y-auto">
                    <GlobalStandingsTable entries={globalStandings} />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
