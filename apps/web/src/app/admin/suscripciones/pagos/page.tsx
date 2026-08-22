import type { Metadata } from "next";
import { fetchPayments } from "@/modules/admin/infrastructure/billingRepository";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Receipt } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Payments — Admin" };

const EVENT_LABEL: Record<string, string> = {
  CHECKOUT_COMPLETED: "Checkout completado",
  INVOICE_PAID: "Pago recibido",
  INVOICE_PAYMENT_FAILED: "Pago fallido",
};

function formatAmount(cents: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(cents / 100);
}

export default async function PaymentsPage() {
  const rows = await fetchPayments();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">Ledger real de checkouts, pagos y pagos fallidos vía Stripe.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Receipt} title="Sin pagos todavía" description="Los eventos de Stripe van a aparecer acá." />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <Card key={r.id} className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{r.accountName}</span>
                  <Badge tone={r.eventType === "INVOICE_PAYMENT_FAILED" ? "destructive" : "success"}>
                    {EVENT_LABEL[r.eventType] ?? r.eventType}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString("es-VE")}</span>
              </div>
              <span className="font-display text-lg font-semibold tabular-nums">{formatAmount(r.amountCents)}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
