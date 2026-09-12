"use client";

import { useState, useTransition } from "react";
import { Buildings } from "@phosphor-icons/react";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { updateOrganizerClubAction } from "../application/actions";
import { CourtsManager } from "./courts-manager";
import type { OrganizerCreatedClub } from "../infrastructure/courtRepository";
import type { Court } from "../domain/court";

/**
 * Edición de un club que este Organizador creó desde el wizard de Crear
 * Torneo (0031) — nombre/ciudad + sus pistas, por si se equivocó al
 * cargarlo. Guarda solo, sin botón: mismo criterio que CourtsManager (blur
 * en el campo dispara el guardado).
 */
export function OrganizerClubEditor({ club, courts }: { club: OrganizerCreatedClub; courts: Court[] }) {
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
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Buildings className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">{club.clubName}</span>
      </div>
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
    </Card>
  );
}
