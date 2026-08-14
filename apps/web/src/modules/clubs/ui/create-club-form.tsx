"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createClubAction, type ClubActionState } from "../application/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const initialState: ClubActionState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Crear club
    </Button>
  );
}

export function CreateClubForm() {
  const [state, formAction] = useActionState(createClubAction, initialState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Field id="name" label="Nombre del club">
        <Input id="name" name="name" placeholder="Padel Club Caracas" required />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field id="city" label="Ciudad" optional>
          <Input id="city" name="city" placeholder="Caracas" />
        </Field>
        <Field id="address" label="Dirección" optional>
          <Input id="address" name="address" placeholder="Av. Principal" />
        </Field>
      </div>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
