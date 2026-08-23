import { createClient } from "@/lib/supabase/server";
import { fetchDunningOutcomes, fetchMrrMovement } from "../infrastructure/billingRepository";
import { fetchPlayerEngagement } from "../infrastructure/usersRepository";

export interface PlanBreakdownRow {
  planName: string;
  accountCount: number;
  mrrCents: number;
}

/**
 * Movimiento de MRR en la ventana (New/Expansion/Contraction/Churned) — la
 * definición estándar de SaaS: New = cuenta nueva pagando; Expansion = una
 * cuenta que YA pagaba subió de plan; Contraction = bajó pero sigue
 * pagando; Churned = canceló o volvió a free. NRR excluye New a propósito
 * (mide retención+expansión de cuentas existentes, no ventas nuevas).
 */
export interface MrrMovement {
  newCents: number;
  expansionCents: number;
  contractionCents: number;
  churnedCents: number;
}

export interface KpisData {
  mrrByPlan: PlanBreakdownRow[];
  freeAccountCount: number;
  paidAccountCount: number;
  churnCount: number;
  currentMrrCents: number;
  movement: MrrMovement;
  /** null = no había MRR al inicio del período (todo es "nuevo"), no aplica un % de crecimiento. */
  mrrGrowthRatePct: number | null;
  /** null = mismo caso, no hay base contra la cual medir retención. */
  netRevenueRetentionPct: number | null;
  logoChurnRatePct: number | null;
  dunningRecoveryRatePct: number | null;
  totalPlayers: number;
  activePlayersLast30d: number;
}

const WINDOW_DAYS = 30;

/** Vista analítica (distinta de las cards de Overview) — desglose por plan, free-vs-pago, churn, y salud de ingresos/retención/engagement. */
export async function getKpisData(): Promise<KpisData> {
  const supabase = await createClient();
  const sinceIso = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: billing }, { data: plans }, { count: churnCount }, movementEvents, dunningOutcomes, engagement] =
    await Promise.all([
      supabase.from("account_billing").select("plan_id, payment_status"),
      supabase.from("plans").select("id, name, monthly_price_cents"),
      supabase.from("billing_events").select("id", { count: "exact", head: true }).eq("event_type", "SUBSCRIPTION_DELETED"),
      fetchMrrMovement(sinceIso),
      fetchDunningOutcomes(),
      fetchPlayerEngagement(),
    ]);

  const planById = new Map((plans ?? []).map((p) => [p.id, p]));
  const activeRows = (billing ?? []).filter((b) => b.payment_status === "ACTIVE");

  const countByPlanId = new Map<string, number>();
  for (const row of activeRows) {
    if (!row.plan_id) continue;
    countByPlanId.set(row.plan_id, (countByPlanId.get(row.plan_id) ?? 0) + 1);
  }

  const mrrByPlan: PlanBreakdownRow[] = Array.from(countByPlanId.entries()).map(([planId, count]) => {
    const plan = planById.get(planId);
    return {
      planName: plan?.name ?? "?",
      accountCount: count,
      mrrCents: (plan?.monthly_price_cents ?? 0) * count,
    };
  });

  const paidAccountCount = activeRows.filter((r) => r.plan_id).length;
  const freeAccountCount = (billing ?? []).length - paidAccountCount;
  const currentMrrCents = mrrByPlan.reduce((sum, row) => sum + row.mrrCents, 0);

  const movement: MrrMovement = { newCents: 0, expansionCents: 0, contractionCents: 0, churnedCents: 0 };
  let newSignupsInWindow = 0;
  let churnedAccountsInWindow = 0;
  for (const event of movementEvents) {
    const { fromPriceCents, toPriceCents, eventType } = event;
    if (eventType === "SUBSCRIPTION_DELETED" || (fromPriceCents != null && toPriceCents == null)) {
      movement.churnedCents += fromPriceCents ?? 0;
      churnedAccountsInWindow += 1;
    } else if (fromPriceCents == null && toPriceCents != null) {
      movement.newCents += toPriceCents;
      newSignupsInWindow += 1;
    } else if (fromPriceCents != null && toPriceCents != null) {
      if (toPriceCents > fromPriceCents) movement.expansionCents += toPriceCents - fromPriceCents;
      else if (toPriceCents < fromPriceCents) movement.contractionCents += fromPriceCents - toPriceCents;
    }
  }

  const netMovementCents = movement.newCents + movement.expansionCents - movement.contractionCents - movement.churnedCents;
  const startOfWindowMrrCents = currentMrrCents - netMovementCents;

  const mrrGrowthRatePct = startOfWindowMrrCents > 0 ? (netMovementCents / startOfWindowMrrCents) * 100 : null;

  const existingCustomerNetCents = movement.expansionCents - movement.contractionCents - movement.churnedCents;
  const netRevenueRetentionPct =
    startOfWindowMrrCents > 0 ? ((startOfWindowMrrCents + existingCustomerNetCents) / startOfWindowMrrCents) * 100 : null;

  // Aproximación deliberada: "cuentas pagando al inicio del período" se
  // reconstruye desde el conteo actual, no desde un snapshot histórico real
  // (no existe tabla de snapshots) — currentPaid - nuevas + canceladas de
  // esta ventana. Suficientemente fiel mientras no haya reactivaciones
  // frecuentes dentro de la misma ventana.
  const payingAtStartOfWindow = paidAccountCount - newSignupsInWindow + churnedAccountsInWindow;
  const logoChurnRatePct = payingAtStartOfWindow > 0 ? (churnedAccountsInWindow / payingAtStartOfWindow) * 100 : null;

  const dunningRecoveryRatePct =
    dunningOutcomes.length > 0 ? (dunningOutcomes.filter((o) => o.recovered).length / dunningOutcomes.length) * 100 : null;

  return {
    mrrByPlan,
    freeAccountCount: Math.max(freeAccountCount, 0),
    paidAccountCount,
    churnCount: churnCount ?? 0,
    currentMrrCents,
    movement,
    mrrGrowthRatePct,
    netRevenueRetentionPct,
    logoChurnRatePct,
    dunningRecoveryRatePct,
    totalPlayers: engagement.totalPlayers,
    activePlayersLast30d: engagement.activePlayersLast30d,
  };
}
