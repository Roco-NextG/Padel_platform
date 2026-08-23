"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MapPin, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { addCourtAction, renameCourtAction, toggleCourtStatusAction } from "../application/actions";
import type { Court } from "../domain/court";

function CourtRow({ clubId, court }: { clubId: string; court: Court }) {
  const [name, setName] = useState(court.name);
  const [isPending, startTransition] = useTransition();
  const disabled = court.status === "DISABLED";

  function handleBlur() {
    if (name.trim() && name !== court.name) {
      startTransition(() => {
        renameCourtAction(clubId, court.id, name);
      });
    }
  }

  function handleToggle() {
    startTransition(() => {
      toggleCourtStatusAction(clubId, court.id, !disabled);
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-2.5 rounded-md border border-border bg-surface px-3 py-2"
    >
      <MapPin className="size-4 shrink-0 text-muted-foreground" />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={handleBlur}
        disabled={isPending}
        className="h-8 flex-1 border-none bg-transparent px-1 text-sm shadow-none focus-visible:border-accent"
      />
      {disabled && <Badge tone="neutral">Deshabilitada</Badge>}
      <Button type="button" variant="ghost" size="sm" loading={isPending} onClick={handleToggle}>
        {disabled ? "Reactivar" : "Deshabilitar"}
      </Button>
    </motion.div>
  );
}

export function CourtsManager({ clubId, courts }: { clubId: string; courts: Court[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {courts.map((court) => (
          <CourtRow key={court.id} clubId={clubId} court={court} />
        ))}
      </AnimatePresence>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={isPending}
        className="mt-1 self-start"
        onClick={() =>
          startTransition(() => {
            addCourtAction(clubId);
          })
        }
      >
        <Plus className="size-3.5" /> Añadir pista
      </Button>
    </div>
  );
}
