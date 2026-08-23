import type { Metadata } from "next";
import { getKpisData } from "@/modules/admin/application/getKpisData";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartLineUp } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = { title: "KPIs — Admin" };

function formatCents(cents: number): string {
  return new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function formatSignedCents(cents: number): string {
  const formatted = formatCents(Math.abs(cents));
  if (cents > 0) return `+${formatted}`;
  if (cents < 0) return `-${formatted}`;
  return formatted;
}

function formatPct(pct: number | null): string {
  if (pct === null) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="font-display text-2xl font-semibold tabular-nums">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </Card>
  );
}

export default async function KpisPage() {
  const {
    mrrByPlan,
    freeAccountCount,
    paidAccountCount,
    churnCount,
    currentMrrCents,
    movement,
    mrrGrowthRatePct,
    netRevenueRetentionPct,
    logoChurnRatePct,
    dunningRecoveryRatePct,
    totalPlayers,
    activePlayersLast30d,
  } = await getKpisData();

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">KPIs</h1>
        <p className="text-sm text-muted-foreground">
          Vista analítica — salud de ingresos, retención y engagement, no solo el estado actual.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Salud de ingresos (últimos 30 días)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="MRR actual" value={formatCents(currentMrrCents)} />
          <KpiCard label="Crecimiento de MRR" value={formatPct(mrrGrowthRatePct)} hint="vs. hace 30 días" />
          <KpiCard
            label="Net Revenue Retention"
            value={formatPct(netRevenueRetentionPct)}
            hint="expansión menos churn, sin contar ventas nuevas"
          />
          <KpiCard label="Cancelaciones (histórico)" value={String(churnCount)} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="MRR nuevo" value={formatSignedCents(movement.newCents)} />
          <KpiCard label="MRR de expansión" value={formatSignedCents(movement.expansionCents)} />
          <KpiCard label="MRR por downgrade" value={formatSignedCents(-movement.contractionCents)} />
          <KpiCard label="MRR cancelado" value={formatSignedCents(-movement.churnedCents)} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Retención y riesgo</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Churn de cuentas" value={formatPct(logoChurnRatePct)} hint="últimos 30 días" />
          <KpiCard
            label="Recuperación de pagos fallidos"
            value={formatPct(dunningRecoveryRatePct)}
            hint="de todas las cuentas que tuvieron un pago fallido, cuántas volvieron a estar al día"
          />
          <KpiCard label="Cuentas gratis" value={String(freeAccountCount)} />
          <KpiCard label="Cuentas de pago" value={String(paidAccountCount)} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Engagement de jugadores</h2>
        <p className="text-xs text-muted-foreground">
          El indicador que predice la renovación de un club antes que la factura: si sus jugadores dejan de entrar, el
          club cancela en 60-90 días sin importar el estado de pago de hoy. Todavía no está desglosado por club — eso
          necesita el esquema de inscripción a torneos, que no existe en esta fase.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Jugadores totales" value={String(totalPlayers)} />
          <KpiCard
            label="Activos (30 días)"
            value={String(activePlayersLast30d)}
            hint={totalPlayers > 0 ? `${((activePlayersLast30d / totalPlayers) * 100).toFixed(0)}% del total` : undefined}
          />
        </div>
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
