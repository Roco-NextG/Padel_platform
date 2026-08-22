import Stripe from "stripe";

/**
 * Server-only Stripe client. Import ONLY from Server Actions/Route
 * Handlers, never from a "use client" file — STRIPE_SECRET_KEY must never
 * reach the browser. Mirrors lib/supabase/admin.ts's pattern exactly.
 */
export function createStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Falta STRIPE_SECRET_KEY en el entorno.");
  }
  return new Stripe(secretKey);
}
