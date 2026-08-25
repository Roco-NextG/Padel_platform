"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Trophy } from "@phosphor-icons/react";
import { updateTournamentAction, type UpdateTournamentState } from "../application/wizardActions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import type { Tournament } from "../domain/tournament";

const initialState: UpdateTournamentState = { error: null };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Guardar
    </Button>
  );
}

export function TournamentDatosForm({ tournament }: { tournament: Tournament }) {
  const action = updateTournamentAction.bind(null, tournament.id);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="relative h-[150px] overflow-hidden rounded-lg bg-surface-secondary bg-[radial-gradient(circle_at_20%_100%,var(--color-accent-muted),transparent_65%)]">
        <div className="absolute inset-0 flex items-end p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-full border-4 border-background bg-accent text-accent-foreground shadow-md">
              <Trophy className="size-6" weight="fill" />
            </div>
            <div className="flex flex-col text-foreground">
              <span className="text-sm font-medium">{tournament.name}</span>
              <span className="text-xs text-muted-foreground">{tournament.clubName}</span>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <form action={formAction} className="flex flex-col gap-5">
          {state.error && <Alert tone="error">{state.error}</Alert>}
          {state.ok && <Alert tone="success">Guardado.</Alert>}

          <Field id="name" label="Nombre del torneo">
            <Input id="name" name="name" defaultValue={tournament.name} required />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field id="startDate" label="Fecha de inicio" optional>
              <Input id="startDate" name="startDate" type="date" defaultValue={tournament.startDate ?? ""} />
            </Field>
            <Field id="endDate" label="Fecha de fin" optional>
              <Input id="endDate" name="endDate" type="date" defaultValue={tournament.endDate ?? ""} />
            </Field>
          </div>

          <Field id="description" label="Descripción" optional>
            <Textarea id="description" name="description" rows={3} defaultValue={tournament.description ?? ""} />
          </Field>

          <div>
            <SaveButton />
          </div>
        </form>
      </Card>
    </div>
  );
}
