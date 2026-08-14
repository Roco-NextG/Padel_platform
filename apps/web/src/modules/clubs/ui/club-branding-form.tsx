"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateClubBrandingAction, type ClubActionState } from "../application/actions";
import type { Club } from "../domain/club";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

const initialState: ClubActionState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Guardar branding
    </Button>
  );
}

function ColorField({
  id,
  label,
  defaultValue,
  optional,
}: {
  id: string;
  label: string;
  defaultValue: string;
  optional?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const isValidHex = /^#[0-9a-fA-F]{6}$/.test(value);

  return (
    <Field id={id} label={label} optional={optional}>
      <div className="flex items-center gap-2">
        <span
          className="size-11 shrink-0 rounded-md border border-border-strong"
          style={{ backgroundColor: isValidHex ? value : "transparent" }}
        />
        <Input
          id={id}
          name={id}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="#2454E0"
          maxLength={7}
        />
      </div>
    </Field>
  );
}

export function ClubBrandingForm({ club }: { club: Club }) {
  const [state, formAction] = useActionState(updateClubBrandingAction, initialState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">Branding actualizado.</Alert>}

      <p className="text-xs text-muted-foreground">
        Validamos automáticamente que tus colores cumplan el contraste mínimo (WCAG AA) antes de
        guardarlos — así tu branding nunca compromete la legibilidad de la app.
      </p>

      <ColorField
        id="primaryColor"
        label="Color primario"
        defaultValue={club.branding.primary_color ?? "#2454E0"}
      />
      <ColorField
        id="secondaryColor"
        label="Color secundario"
        defaultValue={club.branding.secondary_color ?? ""}
        optional
      />
      <ColorField
        id="accentColor"
        label="Acento"
        defaultValue={club.branding.accent ?? ""}
        optional
      />

      <Field id="logoUrl" label="URL del logo" optional>
        <Input
          id="logoUrl"
          name="logoUrl"
          type="url"
          defaultValue={club.branding.logo_url ?? ""}
          placeholder="https://..."
        />
      </Field>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
