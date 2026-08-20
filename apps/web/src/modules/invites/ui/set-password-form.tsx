"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setPasswordAction, type SetPasswordState } from "../application/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const initialState: SetPasswordState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" loading={pending} className="w-full">
      Activar cuenta
    </Button>
  );
}

export function SetPasswordForm() {
  const [state, formAction] = useActionState(setPasswordAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <Field id="password" label="Elige una contraseña">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>

      <SubmitButton />
    </form>
  );
}
