"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Buildings, MapPin, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { createHostClubAction } from "../application/hostClubActions";
import type { ClubHostOption } from "@/modules/courts/infrastructure/courtRepository";

/**
 * El wizard del Club no necesita esto (su propio club_id ya es la sede) —
 * solo el Organizador elige dónde aloja el torneo, y con eso hereda las
 * pistas y el roster de jugadores de ese club (además del suyo propio),
 * decisión confirmada con el usuario. Sin selección todavía = ningún hidden
 * input con valor, el form falla validación server-side (createTournamentAction).
 */
export function HostClubPicker({ options: initialOptions }: { options: ClubHostOption[] }) {
  const [options, setOptions] = useState(initialOptions);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [courtCount, setCourtCount] = useState("2");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    const count = Number(courtCount);
    startTransition(async () => {
      const result = await createHostClubAction(name, city, count);
      if (result.error || !result.club) {
        setError(result.error ?? "No se pudo crear el club.");
        return;
      }
      setOptions((prev) => [...prev, result.club!]);
      setSelected(result.club!.clubId);
      setCreating(false);
      setName("");
      setCity("");
      setCourtCount("2");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="hostClubId" value={selected ?? ""} />

      {options.length === 0 ? (
        <p className="rounded-md border border-dashed border-border-strong px-3 py-4 text-center text-sm text-muted-foreground">
          Todavía no hay ningún club con pistas cargadas en la plataforma.
        </p>
      ) : (
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
      )}

      {!creating ? (
        <Button type="button" variant="secondary" size="sm" onClick={() => setCreating(true)} className="w-fit gap-1.5">
          <Plus className="size-4" />
          Agregar un club nuevo
        </Button>
      ) : (
        <div className="flex flex-col gap-3 rounded-md border border-border-strong p-3.5">
          <p className="text-xs text-muted-foreground">
            El club queda cargado en la plataforma con las pistas que indiques, listo para elegir como sede ahora mismo.
          </p>
          {error && <Alert tone="error">{error}</Alert>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field id="hostClubName" label="Nombre del club">
              <Input id="hostClubName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Club Las Palmas" />
            </Field>
            <Field id="hostClubCity" label="Ciudad" optional>
              <Input id="hostClubCity" value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
            <Field id="hostClubCourtCount" label="Cantidad de pistas">
              <Input
                id="hostClubCourtCount"
                type="number"
                min={1}
                max={20}
                value={courtCount}
                onChange={(e) => setCourtCount(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" loading={isPending} onClick={handleCreate}>
              Crear club
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)} disabled={isPending}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
