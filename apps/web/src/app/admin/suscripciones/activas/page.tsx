import type { Metadata } from "next";
import { fetchActiveAccountBilling } from "@/modules/admin/infrastructure/billingRepository";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckoutLinkButton } from "@/modules/admin/ui/checkout-link-button";
import { CreditCard } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Active plans — Admin" };

const STATUS_TONE: Record<string, "success" | "warning" | "destructive" | "neutral"> = {
  ACTIVE: "success",
  TRIALING: "success",
  PAST_DUE: "warning",
  UNPAID: "destructive",
  INCOMPLETE: "warning",
  CANCELED: "neutral",
  NONE: "neutral",
};

export default async function ActivePlansPage() {
  const rows = await fetchActiveAccountBilling();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Active plans</h1>
        <p className="text-sm text-muted-foreground">
          Cuentas con plan asignado o algún estado de pago. Generá el link de checkout para cuentas con plan
          asignado a mano que todavía no tienen billing real de Stripe.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={CreditCard} title="Sin planes activos" description="Asigná un plan desde Users para verlo acá." />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <Card key={`${r.accountType}-${r.accountId}`} className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{r.accountName}</span>
                  <Badge tone="accent">{r.planName ?? "Free"}</Badge>
                  <Badge tone={STATUS_TONE[r.paymentStatus] ?? "neutral"}>{r.paymentStatus}</Badge>
                </div>
                {r.currentPeriodEnd && (
                  <span className="text-xs text-muted-foreground">
                    Vence: {new Date(r.currentPeriodEnd).toLocaleDateString("es-VE")}
                  </span>
                )}
              </div>
              {r.planId && !r.stripeCustomerId && (
                <CheckoutLinkButton accountType={r.accountType} accountId={r.accountId} planId={r.planId} />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
