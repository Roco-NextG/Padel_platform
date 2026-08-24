"use client";

import { useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { addSponsorAction, removeSponsorAction } from "../application/sponsorActions";
import type { Sponsor } from "../domain/sponsor";

export function SponsorsManager({ tournamentId, sponsors: initialSponsors }: { tournamentId: string; sponsors: Sponsor[] }) {
  const [sponsors, setSponsors] = useState(initialSponsors);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleAdd(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addSponsorAction(tournamentId, formData);
      if (result.error || !result.sponsor) {
        setError(result.error ?? "No se pudo agregar el sponsor.");
        return;
      }
      setSponsors((prev) => [...prev, { id: result.sponsor!.id, tournamentId, name: result.sponsor!.name, logoUrl: result.sponsor!.logoUrl }]);
      formRef.current?.reset();
    });
  }

  function handleRemove(sponsorId: string) {
    startTransition(async () => {
      const result = await removeSponsorAction(tournamentId, sponsorId);
      if (!result.error) setSponsors((prev) => prev.filter((s) => s.id !== sponsorId));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <AnimatePresence>
          {sponsors.map((s) => (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative flex w-28 flex-col items-center gap-1.5 rounded-md border border-border bg-surface p-2.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.logoUrl} alt={s.name} className="h-12 w-full object-contain" />
              <span className="w-full truncate text-center text-xs text-muted-foreground">{s.name}</span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleRemove(s.id)}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-surface-secondary p-1 text-muted-foreground hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {sponsors.length === 0 && <p className="text-xs text-muted-foreground">Sin sponsors todavía.</p>}

      <form ref={formRef} action={handleAdd} className="flex flex-wrap items-end gap-3">
        <Field id="sponsor-name" label="Nombre">
          <Input id="sponsor-name" name="name" placeholder="Nombre del sponsor" required className="w-48" />
        </Field>
        <Field id="sponsor-logo" label="Logo" hint="PNG, JPG, WEBP o SVG · máx. 2MB">
          <input
            id="sponsor-logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            required
            className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-surface-secondary file:px-3 file:py-2 file:text-xs file:font-medium file:text-foreground"
          />
        </Field>
        <Button type="submit" size="md" loading={isPending} className="gap-1.5">
          <Plus className="size-4" />
          Agregar
        </Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
