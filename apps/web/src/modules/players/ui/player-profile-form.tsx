"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updatePlayerProfileAction, type PlayerActionState } from "../application/actions";
import type { Player } from "../domain/player";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { ChoiceGroup } from "@/components/ui/choice-group";

const initialState: PlayerActionState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className="w-full sm:w-auto">
      Guardar cambios
    </Button>
  );
}

export function PlayerProfileForm({ player }: { player: Player }) {
  const [state, formAction] = useActionState(updatePlayerProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">Perfil actualizado.</Alert>}

      <div className="grid grid-cols-2 gap-4">
        <Field id="firstName" label="Nombre">
          <Input id="firstName" name="firstName" defaultValue={player.firstName} required />
        </Field>
        <Field id="lastName" label="Apellido">
          <Input id="lastName" name="lastName" defaultValue={player.lastName} required />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field id="birthDate" label="Fecha de nacimiento" optional>
          <Input
            id="birthDate"
            name="birthDate"
            type="date"
            defaultValue={player.birthDate ?? ""}
          />
        </Field>
        <Field id="city" label="Ciudad" optional>
          <Input id="city" name="city" defaultValue={player.city ?? ""} placeholder="Caracas" />
        </Field>
      </div>

      <Field id="gender" label="Género" optional>
        <ChoiceGroup
          name="gender"
          defaultValue={player.gender ?? undefined}
          options={[
            { value: "MALE", label: "Masculino" },
            { value: "FEMALE", label: "Femenino" },
            { value: "OTHER", label: "Otro" },
          ]}
        />
      </Field>

      <Field id="hand" label="Mano hábil" optional>
        <ChoiceGroup
          name="hand"
          defaultValue={player.hand ?? undefined}
          options={[
            { value: "RIGHT", label: "Derecha" },
            { value: "LEFT", label: "Izquierda" },
          ]}
        />
      </Field>

      <Field id="preferredPosition" label="Posición preferida" optional>
        <ChoiceGroup
          name="preferredPosition"
          defaultValue={player.preferredPosition ?? undefined}
          options={[
            { value: "DRIVE", label: "Drive" },
            { value: "REVES", label: "Revés" },
            { value: "BOTH", label: "Ambas" },
          ]}
        />
      </Field>

      <Switch
        name="publicProfile"
        label="Perfil público"
        description="Tu nombre, foto, rating e historial serán visibles para otros jugadores."
        defaultChecked={player.publicProfile}
      />

      <SubmitButton />
    </form>
  );
}
