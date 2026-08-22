import { NextResponse, type NextRequest } from "next/server";
import { createStripeClient } from "@/lib/stripe/client";
import { handleStripeWebhookEvent } from "@/modules/admin/application/handleStripeWebhookEvent";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Falta la firma o STRIPE_WEBHOOK_SECRET." }, { status: 400 });
  }

  const stripe = createStripeClient();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Firma inválida." }, { status: 400 });
  }

  try {
    await handleStripeWebhookEvent(event);
  } catch (e) {
    console.error(`handleStripeWebhookEvent falló para el evento ${event.id}:`, e);
    return NextResponse.json({ error: "No se pudo procesar el evento." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
