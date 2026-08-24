"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Rocket, CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { publishTournamentAction, unpublishTournamentAction } from "../application/publishActions";

export function PublishPanel({ tournamentId, isPublished }: { tournamentId: string; isPublished: boolean }) {
  const [published, setPublished] = useState(isPublished);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePublish() {
    setError(null);
    startTransition(async () => {
      const result = await publishTournamentAction(tournamentId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setPublished(true);
    });
  }

  function handleUnpublish() {
    setError(null);
    startTransition(async () => {
      const result = await unpublishTournamentAction(tournamentId);
      if (!result.error) setPublished(false);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {published ? (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-md border border-success-muted bg-success-muted px-4 py-3"
        >
          <CheckCircle className="size-5 shrink-0 text-success" weight="fill" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">Torneo publicado — inscripciones abiertas</span>
            <span className="text-xs text-muted-foreground">Podés despublicarlo si necesitás volver a editar algo.</span>
          </div>
          <Button type="button" variant="ghost" size="sm" loading={isPending} onClick={handleUnpublish} className="ml-auto shrink-0">
            Despublicar
          </Button>
        </motion.div>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border-strong px-4 py-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">Torneo en borrador</span>
            <span className="text-xs text-muted-foreground">Nadie lo ve todavía — publicalo para abrir inscripciones.</span>
          </div>
          <Button type="button" loading={isPending} onClick={handlePublish} className="shrink-0 gap-1.5">
            <Rocket className="size-4" />
            Publicar
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
