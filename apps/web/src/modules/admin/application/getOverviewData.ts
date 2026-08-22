import { createClient } from "@/lib/supabase/server";
import { fetchAllPlatformUsers, type PlatformAccount } from "../infrastructure/usersRepository";

export interface OverviewKpis {
  clubCount: number;
  organizerCount: number;
  playerCount: number;
  mrrCents: number;
  freeToPaidUpgrades: number;
  paymentIssueCount: number;
}

export interface OverviewData {
  kpis: OverviewKpis;
  accounts: PlatformAccount[];
}

export async function getOverviewData(): Promise<OverviewData> {
  const supabase = await createClient();

  const [
    { count: clubCount },
    { count: organizerCount },
    { count: playerCount },
    { data: activeBilling },
    { data: plans },
    { count: paymentIssueCount },
    { count: upgradeCount },
    accounts,
  ] = await Promise.all([
    supabase.from("clubs").select("id", { count: "exact", head: true }),
    supabase.from("organizers").select("id", { count: "exact", head: true }),
    supabase.from("players").select("id", { count: "exact", head: true }),
    supabase
      .from("account_billing")
      .select("plan_id")
      .eq("payment_status", "ACTIVE")
      .not("stripe_subscription_id", "is", null),
    supabase.from("plans").select("id, monthly_price_cents"),
    supabase
      .from("account_billing")
      .select("id", { count: "exact", head: true })
      .in("payment_status", ["PAST_DUE", "UNPAID", "INCOMPLETE"]),
    supabase
      .from("billing_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "CHECKOUT_COMPLETED"),
    fetchAllPlatformUsers(),
  ]);

  const priceByPlanId = new Map((plans ?? []).map((p) => [p.id, p.monthly_price_cents]));
  const mrrCents = (activeBilling ?? []).reduce(
    (sum, row) => sum + (row.plan_id ? (priceByPlanId.get(row.plan_id) ?? 0) : 0),
    0
  );

  return {
    kpis: {
      clubCount: clubCount ?? 0,
      organizerCount: organizerCount ?? 0,
      playerCount: playerCount ?? 0,
      mrrCents,
      freeToPaidUpgrades: upgradeCount ?? 0,
      paymentIssueCount: paymentIssueCount ?? 0,
    },
    accounts,
  };
}
