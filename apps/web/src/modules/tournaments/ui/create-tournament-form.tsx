"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createTournamentAction, type CreateTournamentState } from "../application/wizardActions";
import { HostClubPicker } from "./host-club-picker";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import type { ClubHostOption } from "@/modules/courts/infrastructure/courtRepository";

const initialState: CreateTournamentState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} size="lg">
      Crear torneo
    </Button>
  );
}

export function CreateTournamentForm({
  isOrganizador,
  hostOptions,
}: {
  isOrganizador: boolean;
  hostOptions: ClubHostOption[];
}) {
  const [state, formAction] = useActionState(createTournamentAction, initialState);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      {isOrganizador && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">¿En qué club se juega?</span>
          <p className="text-xs text-muted-foreground">
            Vas a poder inscribir tanto a tu propia base de jugadores como a la de este club.
          </p>
          <HostClubPicker options={hostOptions} />
        </div>
      )}

      <Field id="name" label="Nombre del torneo">
        <Input id="name" name="name" placeholder="Copa Vela" required />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field id="startDate" label="Fecha de inicio" optional>
          <Input id="startDate" name="startDate" type="date" />
        </Field>
        <Field id="endDate" label="Fecha de fin" optional>
          <Input id="endDate" name="endDate" type="date" />
        </Field>
      </div>

      <Field id="description" label="Descripción" optional>
        <Textarea id="description" name="description" rows={3} placeholder="Torneo abierto de pádel..." />
      </Field>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
