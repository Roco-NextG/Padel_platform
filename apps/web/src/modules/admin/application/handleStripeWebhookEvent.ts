import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentStatus } from "@/lib/supabase/database.types";

const STRIPE_STATUS_TO_PAYMENT_STATUS: Record<Stripe.Subscription.Status, PaymentStatus> = {
  active: "ACTIVE",
  trialing: "TRIALING",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  incomplete: "INCOMPLETE",
  incomplete_expired: "INCOMPLETE",
  unpaid: "UNPAID",
  paused: "CANCELED",
};

interface AccountRef {
  club_id: string | null;
  organizer_id: string | null;
}

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Todas las escrituras acá usan el service-role client — un webhook de
 * Stripe no trae sesión de usuario. Guardia de idempotencia: intenta
 * insertar la fila de billing_events (stripe_event_id = event.id, único)
 * ANTES de tocar account_billing — si Stripe reenvía el mismo evento
 * (reintento por timeout), el insert falla por duplicado y no se vuelve a
 * aplicar el efecto.
 */
export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const accountType = session.metadata?.account_type;
      const accountId = session.metadata?.account_id;
      const planId = session.metadata?.plan_id;
      if (!accountType || !accountId || !planId) return;
      const ref = accountRefFor(accountType, accountId);

      const { data: existing } = await admin.from("account_billing").select("plan_id").match(ref).maybeSingle();

      const isNew = await logEventIfNew(admin, event, {
        ...ref,
        event_type: "CHECKOUT_COMPLETED",
        from_plan_id: existing?.plan_id ?? null,
        to_plan_id: planId,
        payment_status_after: "ACTIVE",
      });
      if (!isNew) return;

      await admin.from("account_billing").upsert(
        {
          ...ref,
          plan_id: planId,
          stripe_customer_id: typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null),
          stripe_subscription_id:
            typeof session.subscription === "string" ? session.subscription : (session.subscription?.id ?? null),
          payment_status: "ACTIVE",
        },
        { onConflict: ref.club_id ? "club_id" : "organizer_id" }
      );
      return;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const ref = await accountRefForCustomer(admin, subscription.customer);
      if (!ref) return;

      const paymentStatus = STRIPE_STATUS_TO_PAYMENT_STATUS[subscription.status];
      const periodEnd = subscription.items.data[0]?.current_period_end;

      const isNew = await logEventIfNew(admin, event, {
        ...ref,
        event_type: "SUBSCRIPTION_UPDATED",
        payment_status_after: paymentStatus,
      });
      if (!isNew) return;

      await admin
        .from("account_billing")
        .update({
          payment_status: paymentStatus,
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        })
        .match(ref);
      return;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const ref = await accountRefForCustomer(admin, subscription.customer);
      if (!ref) return;

      const isNew = await logEventIfNew(admin, event, {
        ...ref,
        event_type: "SUBSCRIPTION_DELETED",
        payment_status_after: "CANCELED",
      });
      if (!isNew) return;

      await admin.from("account_billing").update({ payment_status: "CANCELED" }).match(ref);
      return;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const ref = await accountRefForCustomer(admin, invoice.customer);
      if (!ref) return;

      const isNew = await logEventIfNew(admin, event, {
        ...ref,
        event_type: "INVOICE_PAYMENT_FAILED",
        amount_cents: invoice.amount_due,
        payment_status_after: "PAST_DUE",
      });
      if (!isNew) return;

      await admin.from("account_billing").update({ payment_status: "PAST_DUE" }).match(ref);
      return;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const ref = await accountRefForCustomer(admin, invoice.customer);
      if (!ref) return;

      const isNew = await logEventIfNew(admin, event, {
        ...ref,
        event_type: "INVOICE_PAID",
        amount_cents: invoice.amount_paid,
        payment_status_after: "ACTIVE",
      });
      if (!isNew) return;

      await admin.from("account_billing").update({ payment_status: "ACTIVE" }).match(ref);
      return;
    }

    default:
      return;
  }
}

/** Devuelve true si esta es la primera vez que se ve event.id (seguro aplicar el efecto), false si ya se procesó. */
async function logEventIfNew(
  admin: Admin,
  event: Stripe.Event,
  fields: {
    club_id: string | null;
    organizer_id: string | null;
    event_type: string;
    from_plan_id?: string | null;
    to_plan_id?: string | null;
    amount_cents?: number | null;
    payment_status_after: PaymentStatus;
  }
): Promise<boolean> {
  const { error } = await admin.from("billing_events").insert({
    ...fields,
    stripe_event_id: event.id,
    raw_payload: event.data.object as unknown as Record<string, unknown>,
  });
  if (!error) return true;
  if (error.message.includes("duplicate key")) return false;
  throw new Error(error.message);
}

function accountRefFor(accountType: string, accountId: string): AccountRef {
  return {
    club_id: accountType === "CLUB" ? accountId : null,
    organizer_id: accountType === "ORGANIZADOR" ? accountId : null,
  };
}

async function accountRefForCustomer(
  admin: Admin,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): Promise<AccountRef | null> {
  const customerId = typeof customer === "string" ? customer : customer?.id;
  if (!customerId) return null;

  const { data } = await admin
    .from("account_billing")
    .select("club_id, organizer_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (!data) return null;
  return { club_id: data.club_id, organizer_id: data.organizer_id };
}
