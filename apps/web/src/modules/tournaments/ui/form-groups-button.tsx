"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { formGroupsAction, type FormGroupsState } from "../application/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";

const initialState: FormGroupsState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      Formar grupos
    </Button>
  );
}

export function FormGroupsButton({ tournamentId, categoryId }: { tournamentId: string; categoryId: string }) {
  const boundAction = formGroupsAction.bind(null, tournamentId, categoryId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <Field id="groupSize" label="Equipos por grupo">
        <Input id="groupSize" name="groupSize" type="number" min={2} defaultValue={4} className="w-24" />
      </Field>
      <SubmitButton />
      {state.error && <Alert tone="error">{state.error}</Alert>}
    </form>
  );
}
