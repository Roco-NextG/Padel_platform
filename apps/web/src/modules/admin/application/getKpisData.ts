import { createClient } from "@/lib/supabase/server";

export interface PlanBreakdownRow {
  planName: string;
  accountCount: number;
  mrrCents: number;
}

export interface KpisData {
  mrrByPlan: PlanBreakdownRow[];
  freeAccountCount: number;
  paidAccountCount: number;
  churnCount: number;
}

/** Vista analítica (distinta de las cards de Overview) — desglose por plan, free-vs-pago, churn. */
export async function getKpisData(): Promise<KpisData> {
  const supabase = await createClient();

  const [{ data: billing }, { data: plans }, { count: churnCount }] = await Promise.all([
    supabase.from("account_billing").select("plan_id, payment_status"),
    supabase.from("plans").select("id, name, monthly_price_cents"),
    supabase.from("billing_events").select("id", { count: "exact", head: true }).eq("event_type", "SUBSCRIPTION_DELETED"),
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

  return {
    mrrByPlan,
    freeAccountCount: Math.max(freeAccountCount, 0),
    paidAccountCount,
    churnCount: churnCount ?? 0,
  };
}
