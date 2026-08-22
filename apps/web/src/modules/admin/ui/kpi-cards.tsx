import { Card } from "@/components/ui/card";
import type { OverviewKpis } from "../application/getOverviewData";

function formatCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("es-VE", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="font-display text-2xl font-semibold tabular-nums">{value}</span>
    </Card>
  );
}

export function KpiCards({ kpis }: { kpis: OverviewKpis }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiCard label="Clubs / Organizadores / Jugadores" value={`${kpis.clubCount} / ${kpis.organizerCount} / ${kpis.playerCount}`} />
      <KpiCard label="MRR" value={formatCents(kpis.mrrCents)} />
      <KpiCard label="Pasaron de free a pago" value={String(kpis.freeToPaidUpgrades)} />
      <KpiCard label="Problemas de pago" value={String(kpis.paymentIssueCount)} />
    </div>
  );
}
