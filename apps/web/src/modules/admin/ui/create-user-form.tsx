"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createUserAction, type CreateUserActionState } from "../application/usersActions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { ChoiceGroup } from "@/components/ui/choice-group";
import type { PlanRow } from "../infrastructure/billingRepository";

const initialState: CreateUserActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Crear cuenta
    </Button>
  );
}

export function CreateUserForm({ plans }: { plans: PlanRow[] }) {
  const [state, formAction] = useActionState(createUserAction, initialState);
  const [tipoUsuario, setTipoUsuario] = useState<"CLUB" | "ORGANIZADOR" | "JUGADOR">("CLUB");
  const isEntity = tipoUsuario === "CLUB" || tipoUsuario === "ORGANIZADOR";

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-5">
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Tipo de usuario</span>
        <ChoiceGroup
          name="tipoUsuario"
          defaultValue="CLUB"
          onChange={(value) => setTipoUsuario(value as typeof tipoUsuario)}
          options={[
            { value: "CLUB", label: "Club" },
            { value: "ORGANIZADOR", label: "Organizador" },
            { value: "JUGADOR", label: "Jugador" },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field id="firstName" label="Nombre">
          <Input id="firstName" name="firstName" required />
        </Field>
        <Field id="lastName" label="Apellido">
          <Input id="lastName" name="lastName" required />
        </Field>
      </div>

      <Field id="phone" label="Teléfono">
        <Input id="phone" name="phone" type="tel" required />
      </Field>

      <Field id="email" label="Email" hint="Se usa para iniciar sesión y para enviar la invitación.">
        <Input id="email" name="email" type="email" required />
      </Field>

      {isEntity && (
        <>
          <div className="flex flex-col gap-1.5 border-t border-border pt-5">
            <span className="text-sm font-medium text-foreground">
              Datos del {tipoUsuario === "CLUB" ? "club" : "organizador"}
            </span>
          </div>

          <Field id="entityName" label={tipoUsuario === "CLUB" ? "Nombre del club" : "Nombre del organizador"}>
            <Input id="entityName" name="entityName" required />
          </Field>

          <Field id="entityCity" label="Ciudad" optional>
            <Input id="entityCity" name="entityCity" />
          </Field>

          <Field id="entityContactEmail" label="Email de contacto general" optional hint="Distinto del email de inicio de sesión de arriba.">
            <Input id="entityContactEmail" name="entityContactEmail" type="email" />
          </Field>

          <Field id="planId" label="Plan" optional>
            <Select id="planId" name="planId" defaultValue="">
              <option value="">Free</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        </>
      )}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
