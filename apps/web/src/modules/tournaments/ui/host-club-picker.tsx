"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Buildings, MapPin } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { ClubHostOption } from "@/modules/courts/infrastructure/courtRepository";

/**
 * El wizard del Club no necesita esto (su propio club_id ya es la sede) —
 * solo el Organizador elige dónde aloja el torneo, y con eso hereda las
 * pistas y el roster de jugadores de ese club (además del suyo propio),
 * decisión confirmada con el usuario. Sin selección todavía = ningún hidden
 * input con valor, el form falla validación server-side (createTournamentAction).
 */
export function HostClubPicker({ options }: { options: ClubHostOption[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  if (options.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border-strong px-3 py-4 text-center text-sm text-muted-foreground">
        Todavía no hay ningún club con pistas cargadas en la plataforma.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="hostClubId" value={selected ?? ""} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((club) => {
          const active = selected === club.clubId;
          return (
            <motion.button
              key={club.clubId}
              type="button"
              onClick={() => setSelected(club.clubId)}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "relative flex flex-col gap-1.5 overflow-hidden rounded-md border px-3.5 py-3 text-left transition-colors",
                active ? "border-accent bg-accent-muted" : "border-border-strong hover:bg-surface-secondary"
              )}
            >
              <div className="flex items-center gap-2">
                <Buildings className={cn("size-4", active ? "text-accent-text" : "text-muted-foreground")} weight={active ? "fill" : "regular"} />
                <span className="truncate text-sm font-medium text-foreground">{club.clubName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5" />
                {club.courtCount === 0
                  ? "Sin pistas cargadas"
                  : `${club.courtCount} ${club.courtCount === 1 ? "pista" : "pistas"} · ${club.courtNames.join(", ")}`}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
