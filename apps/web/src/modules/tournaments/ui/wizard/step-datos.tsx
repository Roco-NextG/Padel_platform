"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateTournamentDetailsAction, type WizardActionState } from "../../application/wizardActions";
import type { Database } from "@/lib/supabase/database.types";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

type TournamentRow = Database["public"]["Tables"]["tournaments"]["Row"];

const initialState: WizardActionState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Guardar
    </Button>
  );
}

export function StepDatos({ tournament }: { tournament: TournamentRow }) {
  const action = updateTournamentDetailsAction.bind(null, tournament.id);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Datos</h2>
        <p className="text-sm text-muted-foreground">Nombre, fechas y descripción del torneo.</p>
      </div>

      <Card>
        <form action={formAction} className="flex flex-col gap-4">
          {state.error && <Alert tone="error">{state.error}</Alert>}
          {state.success && <Alert tone="success">Guardado.</Alert>}

          <Field id="name" label="Nombre del torneo">
            <Input id="name" name="name" defaultValue={tournament.name} placeholder="Copa Vela" required />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="startDate" label="Fecha de inicio" optional>
              <Input id="startDate" name="startDate" type="date" defaultValue={tournament.start_date ?? ""} />
            </Field>
            <Field id="endDate" label="Fecha de fin" optional>
              <Input id="endDate" name="endDate" type="date" defaultValue={tournament.end_date ?? ""} />
            </Field>
          </div>

          <Field id="description" label="Descripción" optional>
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={tournament.description ?? ""}
              placeholder="Torneo abierto de pádel..."
            />
          </Field>

          <div>
            <SubmitButton />
          </div>
        </form>
      </Card>
    </div>
  );
}
