"use server";

import { revalidatePath } from "next/cache";
import { planSchema } from "../domain/plan";
import { createPlan, setPlanActive, updatePlan } from "../infrastructure/billingRepository";
import { getCurrentUserContext } from "@/modules/auth/application/getCurrentUserContext";
import { isAdmin } from "@/modules/auth/domain/roles";

export interface PlanActionState {
  error: string | null;
  success: boolean;
}

export interface SimpleActionState {
  error: string | null;
}

async function requireAdmin(): Promise<{ ok: true } | { error: string }> {
  const context = await getCurrentUserContext();
  if (!context) return { error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  if (!isAdmin(context.roles)) return { error: "No tienes permisos de administrador." };
  return { ok: true };
}

function parsePlanForm(formData: FormData) {
  return planSchema.safeParse({
    name: formData.get("name"),
    monthlyPriceCents: formData.get("monthlyPriceCents"),
    currency: formData.get("currency"),
    stripePriceId: formData.get("stripePriceId") || "",
  });
}

export async function createPlanAction(_prev: PlanActionState, formData: FormData): Promise<PlanActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error, success: false };

  const parsed = parsePlanForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del plan.", success: false };
  }

  try {
    await createPlan(parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear el plan.", success: false };
  }

  revalidatePath("/admin/sistema/configuracion");
  return { error: null, success: true };
}

export async function updatePlanAction(planId: string, _prev: PlanActionState, formData: FormData): Promise<PlanActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error, success: false };

  const parsed = parsePlanForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del plan.", success: false };
  }

  try {
    await updatePlan(planId, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo actualizar el plan.", success: false };
  }

  revalidatePath("/admin/sistema/configuracion");
  return { error: null, success: true };
}

export async function setPlanActiveAction(planId: string, active: boolean): Promise<SimpleActionState> {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  try {
    await setPlanActive(planId, active);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo actualizar el plan." };
  }

  revalidatePath("/admin/sistema/configuracion");
  return { error: null };
}
