"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Buildings, CaretDown } from "@phosphor-icons/react";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { updateOrganizerClubAction } from "../application/actions";
import { CourtsManager } from "./courts-manager";
import type { OrganizerCreatedClub } from "../infrastructure/courtRepository";
import type { Court } from "../domain/court";

/**
 * Edición de un club que este Organizador creó desde el wizard de Crear
 * Torneo (0031) — nombre/ciudad + sus pistas, por si se equivocó al
 * cargarlo. Colapsado por default (pedido explícito: con varios clubes
 * creados, mostrarlos todos desplegados de entrada es demasiado ruido) —
 * un click en el encabezado despliega el formulario. Guarda solo, sin
 * botón: mismo criterio que CourtsManager (blur en el campo dispara el
 * guardado).
 */
export function OrganizerClubEditor({ club, courts }: { club: OrganizerCreatedClub; courts: Court[] }) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(club.clubName);
  const [city, setCity] = useState(club.city ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(nextName: string, nextCity: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateOrganizerClubAction(club.clubId, nextName, nextCity);
      if (result.error) setError(result.error);
    });
  }

  return (
    <Card className="flex flex-col gap-0 p-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={expanded ? `Ocultar datos de ${club.clubName}` : `Editar datos de ${club.clubName}`}
        className="flex w-full items-center gap-2.5 p-4 text-left"
      >
        <Buildings className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{club.clubName}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {courts.length} {courts.length === 1 ? "pista" : "pistas"}
        </span>
        <CaretDown className={cn("size-3.5 shrink-0 text-foreground-tertiary transition-transform", expanded && "rotate-180")} weight="bold" />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 border-t border-border p-4">
              {error && <Alert tone="error">{error}</Alert>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field id={`club-name-${club.clubId}`} label="Nombre del club">
                  <Input
                    id={`club-name-${club.clubId}`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => name.trim() && name !== club.clubName && save(name, city)}
                    disabled={isPending}
                  />
                </Field>
                <Field id={`club-city-${club.clubId}`} label="Ciudad" optional>
                  <Input
                    id={`club-city-${club.clubId}`}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onBlur={() => city !== (club.city ?? "") && save(name, city)}
                    disabled={isPending}
                  />
                </Field>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">Pistas</span>
                <CourtsManager clubId={club.clubId} courts={courts} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
