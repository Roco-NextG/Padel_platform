import { createClient } from "@/lib/supabase/server";
import { createStripeClient } from "@/lib/stripe/client";

/** Crea (o reusa) el Stripe Customer de una cuenta, persistiendo el id apenas se conoce. */
async function ensureStripeCustomer(
  accountType: "CLUB" | "ORGANIZADOR",
  accountId: string
): Promise<string> {
  const supabase = await createClient();
  const column = accountType === "CLUB" ? "club_id" : "organizer_id";
  const table = accountType === "CLUB" ? "clubs" : "organizers";

  const { data: billing } = await supabase
    .from("account_billing")
    .select("id, stripe_customer_id")
    .eq(column, accountId)
    .maybeSingle();
  if (billing?.stripe_customer_id) return billing.stripe_customer_id;

  const { data: entity, error: entityError } = await supabase
    .from(table)
    .select("name, contact_email")
    .eq("id", accountId)
    .single();
  if (entityError) throw new Error(entityError.message);

  const stripe = createStripeClient();
  const customer = await stripe.customers.create({
    name: entity.name,
    email: entity.contact_email ?? undefined,
    metadata: { account_type: accountType, account_id: accountId },
  });

  if (billing) {
    const { error } = await supabase
      .from("account_billing")
      .update({ stripe_customer_id: customer.id })
      .eq("id", billing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("account_billing").insert({
      club_id: accountType === "CLUB" ? accountId : null,
      organizer_id: accountType === "ORGANIZADOR" ? accountId : null,
      stripe_customer_id: customer.id,
      payment_status: "NONE",
    });
    if (error) throw new Error(error.message);
  }

  return customer.id;
}

/**
 * Genera el link de Stripe Checkout que el admin envía a mano al club/
 * organizador (sin infra de email transaccional en este stack todavía).
 * client_reference_id/metadata son lo que el webhook usa para saber a qué
 * cuenta aplicar el checkout.session.completed.
 */
export async function createCheckoutLinkForAccount(
  accountType: "CLUB" | "ORGANIZADOR",
  accountId: string,
  planId: string,
  siteUrl: string
): Promise<string> {
  const supabase = await createClient();
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("stripe_price_id")
    .eq("id", planId)
    .single();
  if (planError) throw new Error(planError.message);
  if (!plan.stripe_price_id) {
    throw new Error("Este plan no tiene un Price ID de Stripe configurado — completalo en Configuración primero.");
  }

  const customerId = await ensureStripeCustomer(accountType, accountId);
  const stripe = createStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    client_reference_id: `${accountType}:${accountId}`,
    metadata: { account_type: accountType, account_id: accountId, plan_id: planId },
    success_url: `${siteUrl}/admin/suscripciones/activas?checkout=success`,
    cancel_url: `${siteUrl}/admin/suscripciones/activas?checkout=cancelled`,
  });

  if (!session.url) throw new Error("Stripe no devolvió una URL de checkout.");
  return session.url;
}
