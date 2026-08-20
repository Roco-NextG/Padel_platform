"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { inviteAction, type AdminActionState } from "../application/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { ChoiceGroup } from "@/components/ui/choice-group";

const initialState: AdminActionState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Enviar invitación
    </Button>
  );
}

export function InviteForm() {
  const [state, formAction] = useActionState(inviteAction, initialState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && (
        <Alert tone="success">Invitación enviada — aparecerá en Invitaciones hasta que se acepte.</Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Tipo de cuenta</span>
        <ChoiceGroup
          name="role"
          defaultValue="CLUB"
          options={[
            { value: "CLUB", label: "Club" },
            { value: "ORGANIZADOR", label: "Organizador" },
          ]}
        />
      </div>

      <Field id="name" label="Nombre">
        <Input id="name" name="name" placeholder="Club Vela Pádel" required />
      </Field>

      <Field id="email" label="Email de contacto">
        <Input id="email" name="email" type="email" placeholder="contacto@club.com" required />
      </Field>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
