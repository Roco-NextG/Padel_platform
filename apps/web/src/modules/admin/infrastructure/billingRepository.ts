import { createClient } from "@/lib/supabase/server";
import type { PaymentStatus } from "@/lib/supabase/database.types";
import type { PlanInput } from "../domain/plan";
import { slugifyPlanName } from "../domain/plan";

export interface PlanRow {
  id: string;
  name: string;
  slug: string;
  monthlyPriceCents: number;
  currency: string;
  stripePriceId: string | null;
  isActive: boolean;
}

export async function fetchPlans(): Promise<PlanRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, slug, monthly_price_cents, currency, stripe_price_id, is_active")
    .order("monthly_price_cents");
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    monthlyPriceCents: p.monthly_price_cents,
    currency: p.currency,
    stripePriceId: p.stripe_price_id,
    isActive: p.is_active,
  }));
}

export async function createPlan(input: PlanInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("plans").insert({
    name: input.name,
    slug: slugifyPlanName(input.name),
    monthly_price_cents: input.monthlyPriceCents,
    currency: input.currency,
    stripe_price_id: input.stripePriceId || null,
  });
  if (error) throw new Error(error.message);
}

export async function updatePlan(planId: string, input: PlanInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("plans")
    .update({
      name: input.name,
      monthly_price_cents: input.monthlyPriceCents,
      currency: input.currency,
      stripe_price_id: input.stripePriceId || null,
    })
    .eq("id", planId);
  if (error) throw new Error(error.message);
}

export async function setPlanActive(planId: string, isActive: boolean): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("plans").update({ is_active: isActive }).eq("id", planId);
  if (error) throw new Error(error.message);
}

export interface AccountBillingRow {
  accountType: "CLUB" | "ORGANIZADOR";
  accountId: string;
  accountName: string;
  planId: string | null;
  planName: string | null;
  paymentStatus: PaymentStatus;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
}

/** Cuentas con plan asignado o algún estado de pago real — la base de Active plans. */
export async function fetchActiveAccountBilling(): Promise<AccountBillingRow[]> {
  const supabase = await createClient();
  const [{ data: billing, error }, { data: clubs }, { data: organizers }, { data: plans }] = await Promise.all([
    supabase
      .from("account_billing")
      .select("club_id, organizer_id, plan_id, payment_status, current_period_end, stripe_customer_id")
      .or("plan_id.not.is.null,payment_status.neq.NONE"),
    supabase.from("clubs").select("id, name"),
    supabase.from("organizers").select("id, name"),
    supabase.from("plans").select("id, name"),
  ]);
  if (error) throw new Error(error.message);

  const clubNameById = new Map((clubs ?? []).map((c) => [c.id, c.name]));
  const organizerNameById = new Map((organizers ?? []).map((o) => [o.id, o.name]));
  const planNameById = new Map((plans ?? []).map((p) => [p.id, p.name]));

  return (billing ?? []).map((b) => {
    const accountType: "CLUB" | "ORGANIZADOR" = b.club_id ? "CLUB" : "ORGANIZADOR";
    const accountId = (b.club_id ?? b.organizer_id) as string;
    return {
      accountType,
      accountId,
      accountName: (b.club_id ? clubNameById.get(b.club_id) : organizerNameById.get(b.organizer_id!)) ?? "?",
      planId: b.plan_id,
      planName: b.plan_id ? (planNameById.get(b.plan_id) ?? null) : null,
      paymentStatus: b.payment_status,
      currentPeriodEnd: b.current_period_end,
      stripeCustomerId: b.stripe_customer_id,
    };
  });
}

export interface BillingEventRow {
  id: string;
  accountName: string;
  eventType: string;
  amountCents: number | null;
  paymentStatusAfter: PaymentStatus | null;
  source: "stripe" | "manual";
  rawPayload: Record<string, unknown> | null;
  createdAt: string;
}

interface BillingEventRowWithAccountId extends BillingEventRow {
  accountId: string | null;
}

async function fetchBillingEvents(eventTypes?: string[]): Promise<BillingEventRowWithAccountId[]> {
  const supabase = await createClient();
  let query = supabase
    .from("billing_events")
    .select("id, club_id, organizer_id, event_type, amount_cents, payment_status_after, stripe_event_id, raw_payload, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (eventTypes) query = query.in("event_type", eventTypes);

  const [{ data: events, error }, { data: clubs }, { data: organizers }] = await Promise.all([
    query,
    supabase.from("clubs").select("id, name"),
    supabase.from("organizers").select("id, name"),
  ]);
  if (error) throw new Error(error.message);

  const clubNameById = new Map((clubs ?? []).map((c) => [c.id, c.name]));
  const organizerNameById = new Map((organizers ?? []).map((o) => [o.id, o.name]));

  return (events ?? []).map((e) => ({
    id: e.id,
    accountId: e.club_id ?? e.organizer_id ?? null,
    accountName: (e.club_id ? clubNameById.get(e.club_id) : e.organizer_id ? organizerNameById.get(e.organizer_id) : null) ?? "?",
    eventType: e.event_type,
    amountCents: e.amount_cents,
    paymentStatusAfter: e.payment_status_after,
    source: e.stripe_event_id ? "stripe" : "manual",
    rawPayload: e.raw_payload,
    createdAt: e.created_at,
  }));
}

/** Ledger real de pagos — solo los eventos que representan dinero moviéndose. */
export async function fetchPayments(): Promise<BillingEventRow[]> {
  return fetchBillingEvents(["CHECKOUT_COMPLETED", "INVOICE_PAID", "INVOICE_PAYMENT_FAILED"]);
}

/** Log completo — todo billing_event, Stripe o manual. */
export async function fetchSystemLogs(): Promise<BillingEventRow[]> {
  return fetchBillingEvents();
}

export interface MrrMovementEvent {
  eventType: string;
  fromPriceCents: number | null;
  toPriceCents: number | null;
  createdAt: string;
  accountId: string | null;
}

/** Eventos que representan un cambio de plan real (no cualquier billing_event) — la base de New/Expansion/Contraction/Churned MRR. */
export async function fetchMrrMovement(sinceIso: string): Promise<MrrMovementEvent[]> {
  const supabase = await createClient();
  const [{ data: events, error }, { data: plans }] = await Promise.all([
    supabase
      .from("billing_events")
      .select("event_type, from_plan_id, to_plan_id, club_id, organizer_id, created_at")
      .in("event_type", ["CHECKOUT_COMPLETED", "PLAN_CHANGED_MANUAL", "SUBSCRIPTION_DELETED"])
      .gte("created_at", sinceIso),
    supabase.from("plans").select("id, monthly_price_cents"),
  ]);
  if (error) throw new Error(error.message);

  const priceById = new Map((plans ?? []).map((p) => [p.id, p.monthly_price_cents]));

  return (events ?? []).map((e) => ({
    eventType: e.event_type,
    fromPriceCents: e.from_plan_id ? (priceById.get(e.from_plan_id) ?? null) : null,
    toPriceCents: e.to_plan_id ? (priceById.get(e.to_plan_id) ?? null) : null,
    createdAt: e.created_at,
    accountId: e.club_id ?? e.organizer_id ?? null,
  }));
}

export interface DunningOutcome {
  accountId: string | null;
  recovered: boolean;
}

/**
 * Para cada cuenta que alguna vez tuvo un pago fallido, ¿terminó ACTIVE
 * (se recuperó) o CANCELED/UNPAID (se perdió)? All-time, no acotado a un
 * período — a esta escala de datos, acotarlo por fecha solo deja todo en 0.
 */
export async function fetchDunningOutcomes(): Promise<DunningOutcome[]> {
  const supabase = await createClient();
  const [{ data: failures, error: failuresError }, { data: billing, error: billingError }] = await Promise.all([
    supabase.from("billing_events").select("club_id, organizer_id").eq("event_type", "INVOICE_PAYMENT_FAILED"),
    supabase.from("account_billing").select("club_id, organizer_id, payment_status"),
  ]);
  if (failuresError) throw new Error(failuresError.message);
  if (billingError) throw new Error(billingError.message);

  const statusByAccountId = new Map(
    (billing ?? []).map((b) => [(b.club_id ?? b.organizer_id) as string, b.payment_status])
  );
  const accountIds = new Set((failures ?? []).map((f) => (f.club_id ?? f.organizer_id) as string | null).filter(Boolean));

  return Array.from(accountIds).map((accountId) => ({
    accountId,
    recovered: statusByAccountId.get(accountId as string) === "ACTIVE",
  }));
}

export interface PaymentIssueRow {
  accountType: "CLUB" | "ORGANIZADOR";
  accountId: string;
  accountName: string;
  paymentStatus: PaymentStatus;
  lastFailure: BillingEventRow | null;
}

export async function fetchPaymentIssues(): Promise<PaymentIssueRow[]> {
  const supabase = await createClient();
  const [{ data: billing, error }, { data: clubs }, { data: organizers }, failures] = await Promise.all([
    supabase
      .from("account_billing")
      .select("club_id, organizer_id, payment_status")
      .in("payment_status", ["PAST_DUE", "UNPAID", "INCOMPLETE"]),
    supabase.from("clubs").select("id, name"),
    supabase.from("organizers").select("id, name"),
    fetchBillingEvents(["INVOICE_PAYMENT_FAILED"]),
  ]);
  if (error) throw new Error(error.message);

  const clubNameById = new Map((clubs ?? []).map((c) => [c.id, c.name]));
  const organizerNameById = new Map((organizers ?? []).map((o) => [o.id, o.name]));
  const latestFailureByAccountId = new Map<string, BillingEventRow>();
  for (const f of failures) {
    if (f.accountId && !latestFailureByAccountId.has(f.accountId)) latestFailureByAccountId.set(f.accountId, f);
  }

  return (billing ?? []).map((b) => {
    const accountType: "CLUB" | "ORGANIZADOR" = b.club_id ? "CLUB" : "ORGANIZADOR";
    const accountId = (b.club_id ?? b.organizer_id) as string;
    const accountName = (b.club_id ? clubNameById.get(b.club_id) : organizerNameById.get(b.organizer_id!)) ?? "?";
    return {
      accountType,
      accountId,
      accountName,
      paymentStatus: b.payment_status,
      lastFailure: latestFailureByAccountId.get(accountId) ?? null,
    };
  });
}
