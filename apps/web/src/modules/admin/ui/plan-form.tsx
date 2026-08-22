"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createPlanAction, updatePlanAction, type PlanActionState } from "../application/planActions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import type { PlanRow } from "../infrastructure/billingRepository";

const initialState: PlanActionState = { error: null, success: false };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      {label}
    </Button>
  );
}

export function PlanForm({ plan }: { plan?: PlanRow }) {
  const action = plan ? updatePlanAction.bind(null, plan.id) : createPlanAction;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-md border border-border p-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">Guardado.</Alert>}

      <div className="grid grid-cols-2 gap-3">
        <Field id={`name-${plan?.id ?? "new"}`} label="Nombre del plan">
          <Input id={`name-${plan?.id ?? "new"}`} name="name" defaultValue={plan?.name} required />
        </Field>
        <Field id={`currency-${plan?.id ?? "new"}`} label="Moneda">
          <Input id={`currency-${plan?.id ?? "new"}`} name="currency" defaultValue={plan?.currency ?? "USD"} maxLength={3} required />
        </Field>
      </div>

      <Field
        id={`price-${plan?.id ?? "new"}`}
        label="Precio mensual (en centavos)"
        hint="Ej. 2999 = $29.99/mes."
      >
        <Input
          id={`price-${plan?.id ?? "new"}`}
          name="monthlyPriceCents"
          type="number"
          min={0}
          defaultValue={plan?.monthlyPriceCents ?? 0}
          required
        />
      </Field>

      <Field
        id={`stripe-${plan?.id ?? "new"}`}
        label="Stripe Price ID"
        optional
        hint="Creá el Product/Price en tu Stripe Dashboard y pegá el ID acá — sin esto no se puede generar checkout para este plan."
      >
        <Input id={`stripe-${plan?.id ?? "new"}`} name="stripePriceId" defaultValue={plan?.stripePriceId ?? ""} placeholder="price_..." />
      </Field>

      <div>
        <SubmitButton label={plan ? "Guardar cambios" : "Crear plan"} />
      </div>
    </form>
  );
}
