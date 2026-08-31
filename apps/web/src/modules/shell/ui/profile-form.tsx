"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { updateAccountProfileAction, type UpdateProfileState } from "../application/settingsActions";
import type { ClubSurfaceAccount } from "../infrastructure/accountRepository";

const initialState: UpdateProfileState = { error: null, ok: false };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      Guardar
    </Button>
  );
}

export function ProfileForm({ account }: { account: ClubSurfaceAccount }) {
  const [state, formAction] = useActionState(updateAccountProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">Guardado.</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {account.role === "Club" ? (
          <>
            <Field id="name" label="Nombre del club">
              <Input id="name" name="name" defaultValue={account.name} required />
            </Field>
            <Field id="contactName" label="Persona de contacto">
              <Input id="contactName" name="contactName" defaultValue={account.contactName} />
            </Field>
          </>
        ) : (
          <>
            <input type="hidden" name="name" value={account.name} />
            <Field id="contactFirstName" label="Nombre">
              <Input id="contactFirstName" name="contactFirstName" defaultValue={account.contactFirstName ?? ""} />
            </Field>
            <Field id="contactLastName" label="Apellidos">
              <Input id="contactLastName" name="contactLastName" defaultValue={account.contactLastName ?? ""} />
            </Field>
          </>
        )}
        <Field id="contactPhone" label="Teléfono">
          <Input id="contactPhone" name="contactPhone" type="tel" defaultValue={account.contactPhone ?? ""} />
        </Field>
        <Field id="contactEmail" label="Email">
          <Input id="contactEmail" name="contactEmail" type="email" defaultValue={account.contactEmail ?? ""} />
        </Field>
        <div className="sm:col-span-2">
          <Field id="address" label="Dirección" optional>
            <Input id="address" name="address" defaultValue={account.address ?? ""} />
          </Field>
        </div>
      </div>

      <div>
        <SaveButton />
      </div>
    </form>
  );
}
