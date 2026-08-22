import type { Metadata } from "next";
import { fetchPaymentIssues } from "@/modules/admin/infrastructure/billingRepository";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { WarningCircle } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "Payment issues — Admin" };

export default async function PaymentIssuesPage() {
  const rows = await fetchPaymentIssues();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payment issues</h1>
        <p className="text-sm text-muted-foreground">Cuentas con pagos atrasados, no pagados o incompletos.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={WarningCircle} title="Sin problemas de pago" description="Todo en orden por ahora." />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <Card key={`${r.accountType}-${r.accountId}`} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{r.accountName}</span>
                <Badge tone="destructive">{r.paymentStatus}</Badge>
              </div>
              {r.lastFailure && (
                <span className="text-xs text-muted-foreground">
                  Último intento fallido: {new Date(r.lastFailure.createdAt).toLocaleString("es-VE")}
                </span>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
