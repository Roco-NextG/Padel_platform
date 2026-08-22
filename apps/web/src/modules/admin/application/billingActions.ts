"use server";

import { createCheckoutLinkForAccount } from "../infrastructure/stripeRepository";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { isAdmin } from "@/modules/auth/domain/roles";

export interface CheckoutLinkState {
  error: string | null;
  url: string | null;
}

export async function generateCheckoutLinkAction(
  accountType: "CLUB" | "ORGANIZADOR",
  accountId: string,
  planId: string
): Promise<CheckoutLinkState> {
  const context = await getCurrentUserContext();
  if (!context) return { error: "Tu sesión expiró. Vuelve a iniciar sesión.", url: null };
  if (!isAdmin(context.roles)) return { error: "No tienes permisos de administrador.", url: null };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const url = await createCheckoutLinkForAccount(accountType, accountId, planId, siteUrl);
    return { error: null, url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo generar el link de checkout.", url: null };
  }
}
