"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveOrganizerAction, type OrganizerActionState } from "../application/actions";
import type { Organizer } from "../domain/organizer";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { ChoiceGroup } from "@/components/ui/choice-group";

const initialState: OrganizerActionState = { error: null, success: false };

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {isEditing ? "Guardar cambios" : "Crear organizador"}
    </Button>
  );
}

export function OrganizerForm({ organizer }: { organizer: Organizer | null }) {
  const [state, formAction] = useActionState(saveOrganizerAction, initialState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">Organizador guardado.</Alert>}

      <Field id="name" label="Nombre">
        <Input
          id="name"
          name="name"
          defaultValue={organizer?.name ?? ""}
          placeholder="Circuito Caracas Padel Tour"
          required
        />
      </Field>

      <Field id="type" label="Tipo">
        <ChoiceGroup
          name="type"
          defaultValue={organizer?.type ?? "INDIVIDUAL"}
          options={[
            { value: "INDIVIDUAL", label: "Individual" },
            { value: "COMPANY", label: "Empresa" },
          ]}
        />
      </Field>

      <div>
        <SubmitButton isEditing={!!organizer} />
      </div>
    </form>
  );
}
