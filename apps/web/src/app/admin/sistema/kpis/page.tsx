import type { Metadata } from "next";
import { getKpisData } from "@/modules/admin/application/getKpisData";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartLineUp } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "KPIs — Admin" };

function formatCents(cents: number): string {
  return new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

export default async function KpisPage() {
  const { mrrByPlan, freeAccountCount, paidAccountCount, churnCount } = await getKpisData();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">KPIs</h1>
        <p className="text-sm text-muted-foreground">Vista analítica — desglose por plan, free vs. pago, churn.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Cuentas gratis</span>
          <span className="font-display text-2xl font-semibold tabular-nums">{freeAccountCount}</span>
        </Card>
        <Card className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Cuentas de pago</span>
          <span className="font-display text-2xl font-semibold tabular-nums">{paidAccountCount}</span>
        </Card>
        <Card className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Cancelaciones</span>
          <span className="font-display text-2xl font-semibold tabular-nums">{churnCount}</span>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">MRR por plan</h2>
        {mrrByPlan.length === 0 ? (
          <EmptyState icon={ChartLineUp} title="Sin suscripciones activas" description="El desglose por plan va a aparecer acá." />
        ) : (
          <div className="flex flex-col gap-2">
            {mrrByPlan.map((row) => (
              <Card key={row.planName} className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{row.planName}</span>
                  <span className="text-xs text-muted-foreground">{row.accountCount} cuentas activas</span>
                </div>
                <span className="font-display text-lg font-semibold tabular-nums">{formatCents(row.mrrCents)}</span>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
