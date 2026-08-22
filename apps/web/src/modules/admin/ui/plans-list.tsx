"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CreditCard } from "@phosphor-icons/react";
import { PlanForm } from "./plan-form";
import { setPlanActiveAction } from "../application/planActions";
import type { PlanRow } from "../infrastructure/billingRepository";

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("es-VE", { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100);
}

function PlanRowCard({ plan }: { plan: PlanRow }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleActive() {
    setError(null);
    startTransition(async () => {
      const result = await setPlanActiveAction(plan.id, !plan.isActive);
      setError(result.error);
    });
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <PlanForm plan={plan} />
        <button type="button" onClick={() => setEditing(false)} className="self-start text-xs text-muted-foreground hover:underline">
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{plan.name}</span>
          <Badge tone={plan.isActive ? "success" : "neutral"}>{plan.isActive ? "Activo" : "Inactivo"}</Badge>
          {!plan.stripePriceId && <Badge tone="warning">Sin Stripe Price ID</Badge>}
        </div>
        <span className="text-xs text-muted-foreground">{formatCents(plan.monthlyPriceCents, plan.currency)}/mes</span>
        {error && (
          <span className="text-xs text-destructive" role="alert">
            {error}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
          Editar
        </Button>
        <Button type="button" variant={plan.isActive ? "destructive" : "secondary"} size="sm" loading={isPending} onClick={toggleActive}>
          {plan.isActive ? "Desactivar" : "Activar"}
        </Button>
      </div>
    </Card>
  );
}

export function PlansList({ plans }: { plans: PlanRow[] }) {
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {plans.length === 0 ? (
        <EmptyState icon={CreditCard} title="Sin planes todavía" description="Creá el primero abajo." />
      ) : (
        <div className="flex flex-col gap-2">
          {plans.map((p) => (
            <PlanRowCard key={p.id} plan={p} />
          ))}
        </div>
      )}

      {showNew ? (
        <div className="flex flex-col gap-2">
          <PlanForm />
          <button type="button" onClick={() => setShowNew(false)} className="self-start text-xs text-muted-foreground hover:underline">
            Cerrar
          </button>
        </div>
      ) : (
        <Button type="button" variant="secondary" size="sm" className="self-start" onClick={() => setShowNew(true)}>
          Nuevo plan
        </Button>
      )}
    </div>
  );
}
