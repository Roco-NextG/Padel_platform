"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import type { PlayerFormState } from "../application/playerActions";
import type { VisiblePlayer } from "../domain/player";

const CATEGORY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      {label}
    </Button>
  );
}

export function PlayerForm({
  action,
  player,
  onSaved,
  onCancel,
}: {
  action: (prev: PlayerFormState, formData: FormData) => Promise<PlayerFormState>;
  player?: VisiblePlayer;
  onSaved: (player: VisiblePlayer) => void;
  onCancel: () => void;
}) {
  const initialState: PlayerFormState = { error: null, player: null };
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.player) onSaved(state.player);
    // onSaved se llama una sola vez por cada objeto player nuevo que llega del server action — excluir
    // onSaved de las deps a propósito, es una función inline del padre que cambia en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.player]);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-border bg-surface-secondary p-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid grid-cols-2 gap-3">
        <Field id="firstName" label="Nombre">
          <Input id="firstName" name="firstName" defaultValue={player?.firstName} required />
        </Field>
        <Field id="lastName" label="Apellidos">
          <Input id="lastName" name="lastName" defaultValue={player?.lastName} required />
        </Field>
        <Field id="email" label="Email">
          <Input id="email" name="email" type="email" defaultValue={player?.email ?? ""} required />
        </Field>
        <Field id="phone" label="Teléfono">
          <Input id="phone" name="phone" type="tel" defaultValue={player?.phone ?? ""} required />
        </Field>
        <Field id="category" label="Categoría">
          <Select id="category" name="category" defaultValue={player?.category ?? ""} required>
            <option value="">Elegir...</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                Cat. {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="gender" label="Género" optional>
          <Select id="gender" name="gender" defaultValue={player?.gender ?? ""}>
            <option value="">Sin especificar</option>
            <option value="MALE">Masculino</option>
            <option value="FEMALE">Femenino</option>
            <option value="OTHER">Otro</option>
          </Select>
        </Field>
      </div>
      <div className="flex gap-2">
        <SubmitButton label={player ? "Guardar" : "Crear jugador"} />
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
