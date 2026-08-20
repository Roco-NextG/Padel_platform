"use client";

import { useState, useTransition } from "react";
import { MapPin, Plus, Prohibit, ArrowCounterClockwise } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { addCourtAction, renameCourtAction, setCourtDisabledAction } from "../application/actions";
import type { Court } from "../domain/court";

/**
 * Cada fila lee el nombre/estado directo de `court` (prop), sin duplicarlo en
 * useState — igual que MatchActionsMenu (redesign/partidos-vivo): la Server
 * Action llama revalidatePath("/dashboard/club") y eso ya vuelve a renderizar
 * ClubSettingsPage con la lista fresca, sin necesidad de estado optimista.
 * El `key={court.name}` en el input fuerza un remount limpio cuando el
 * nombre cambia server-side (mismo patrón que category switch en
 * redesign/torneo-bracket, para no quedar mostrando un valor viejo).
 */
function CourtRow({ court }: { court: Court }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isDisabled = court.status === "DISABLED";

  function saveName(value: string) {
    const trimmed = value.trim();
    if (!trimmed || trimmed === court.name) return;
    startTransition(async () => {
      const result = await renameCourtAction(court.id, trimmed);
      setError(result.error);
    });
  }

  function toggleStatus() {
    startTransition(async () => {
      const result = await setCourtDisabledAction(court.id, !isDisabled);
      setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-md border border-border bg-surface px-3 py-2",
          isDisabled && "opacity-60"
        )}
      >
        <MapPin className="size-4 shrink-0 text-muted-foreground" />
        <Input
          key={court.name}
          defaultValue={court.name}
          onBlur={(e) => saveName(e.target.value)}
          disabled={isPending}
          className="h-9"
          aria-label="Nombre de la pista"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={toggleStatus}
          title={
            isDisabled
              ? "Reactivar pista"
              : "Deshabilitar pista — no se borra, queda inactiva para nuevos partidos"
          }
          className="shrink-0 px-2"
        >
          {isDisabled ? <ArrowCounterClockwise className="size-4" /> : <Prohibit className="size-4" />}
        </Button>
      </div>
      {isDisabled && <span className="pl-1 text-xs text-muted-foreground">Deshabilitada</span>}
      {error && (
        <span className="pl-1 text-xs text-destructive" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function CourtsManager({ courts }: { courts: Court[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function addCourt() {
    setError(null);
    startTransition(async () => {
      const result = await addCourtAction();
      setError(result.error);
    });
  }

  return (
    <Card>
      <div className="flex flex-col gap-1 pb-3">
        <h2 className="text-sm font-semibold text-foreground">Pistas del club</h2>
        <p className="text-xs text-muted-foreground">
          Nómbralas como quieras — este listado alimenta el selector de &ldquo;Cambiar
          pista&rdquo; de cada partido y, más adelante, la planificación de horarios.
        </p>
      </div>

      {courts.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Todavía no cargaste ninguna pista.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {courts.map((c) => (
            <CourtRow key={c.id} court={c} />
          ))}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="mt-3">
        <Button type="button" variant="ghost" size="sm" loading={isPending} onClick={addCourt}>
          <Plus className="size-3.5" /> Añadir pista
        </Button>
      </div>
    </Card>
  );
}
